"""Private HTTP bridge around HanaokaYuzu/Gemini-API.

The upstream project talks to the Gemini web app with Google session cookies.
It is intentionally kept behind a loopback listener and a shared secret; the
browser and the Supabase Edge Function must never receive those cookies.
"""

from __future__ import annotations

import asyncio
import base64
import json
import hmac
import mimetypes
import os
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from gemini_webapi import GeminiClient
from loguru import logger

# Upstream diagnostics can include session details. Never emit them in this bridge.
logger.remove()


class ProviderFailure(RuntimeError):
    """Allowlisted public failures, never upstream exception strings."""
    MESSAGES = {
        "PROVIDER_SESSION_EXPIRED": (503, "Provider session requires administrator renewal."),
        "PROVIDER_TIMEOUT": (504, "Image generation timed out. Retry explicitly when ready."),
        "PROVIDER_NO_IMAGE": (502, "Provider returned no generated image."),
        "PROVIDER_NO_TEXT": (502, "Provider returned no valid structured review."),
        "PROVIDER_UNAVAILABLE": (502, "Image provider is unavailable."),
    }

    def __init__(self, code: str):
        self.code = code
        self.status, message = self.MESSAGES[code]
        super().__init__(message)

    def body(self) -> dict:
        return {"code": self.code, "error": str(self)}


def client_is_authenticated(value: GeminiClient) -> bool:
    return getattr(getattr(value, "account_status", None), "name", "") == "AVAILABLE"


async def generate_ready(client, payload, renew_client):
    """Fail closed if renewal remains unauthenticated; never replay a timeout."""
    active_client = client
    renewed = False
    if not client_is_authenticated(active_client):
        active_client = await renew_client()
        renewed = True
    if not client_is_authenticated(active_client):
        raise ProviderFailure("PROVIDER_SESSION_EXPIRED")
    try:
        return await generate(active_client, payload)
    except Exception as error:
        if isinstance(error, ProviderFailure) and error.code != "PROVIDER_SESSION_EXPIRED":
            raise
        is_expired = (
            isinstance(error, ProviderFailure) and error.code == "PROVIDER_SESSION_EXPIRED"
        ) or not client_is_authenticated(active_client)
        if not is_expired:
            raise
        if renewed:
            raise ProviderFailure("PROVIDER_SESSION_EXPIRED") from None
        active_client = await renew_client()
        if not client_is_authenticated(active_client):
            raise ProviderFailure("PROVIDER_SESSION_EXPIRED")
        return await generate(active_client, payload)


def load_dotenv(path: Path = Path(__file__).with_name(".env")) -> None:
    """Load the small bridge config without adding another runtime dependency."""
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv()


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()

def sync_browser_session_cookies(path: Path) -> dict[str, str]:
    """Read the local Chrome session without ever logging cookie values."""
    if env("GEMINI_WEB_AUTO_COOKIE_SYNC", "false").lower() not in {"1", "true", "yes", "on"}:
        return {}
    try:
        import browser_cookie3
    except ImportError:
        return {}

    configured_path = env("GEMINI_WEB_CHROME_COOKIE_FILE")
    profile = env("GEMINI_WEB_CHROME_PROFILE", "Default")
    cookie_path = Path(configured_path).expanduser() if configured_path else (
        Path.home() / "Library/Application Support/Google/Chrome" / profile / "Cookies"
    )
    if not cookie_path.is_file():
        return {}

    try:
        jar = browser_cookie3.chrome(cookie_file=str(cookie_path), domain_name="google.com")
    except Exception:
        return {}

    values = {
        cookie.name: cookie.value
        for cookie in jar
        if cookie.domain == ".google.com"
        and cookie.name in {"__Secure-1PSID", "__Secure-1PSIDTS"}
        and cookie.value
    }
    updates = {"GEMINI_WEB_SECURE_1PSID": values.get("__Secure-1PSID", "")}
    if values.get("__Secure-1PSIDTS"):
        updates["GEMINI_WEB_SECURE_1PSIDTS"] = values["__Secure-1PSIDTS"]
    if not updates["GEMINI_WEB_SECURE_1PSID"]:
        return {}

    lines = path.read_text(encoding="utf-8").splitlines() if path.is_file() else []
    output = []
    replaced = set()
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line else ""
        if key in updates:
            output.append(f"{key}={updates[key]}")
            replaced.add(key)
        else:
            output.append(line)
    for key, value in updates.items():
        if key not in replaced:
            output.append(f"{key}={value}")
    path.write_text("\n".join(output) + "\n", encoding="utf-8")
    return updates


def response(status: int, body: dict) -> bytes:
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    return (
        f"HTTP/1.1 {status} {'OK' if status < 400 else 'Error'}\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        f"Content-Length: {len(payload)}\r\n"
        "Cache-Control: no-store\r\n"
        "Connection: close\r\n\r\n"
    ).encode("ascii") + payload


async def read_request(reader: asyncio.StreamReader, secret: str | None = None) -> tuple[str, dict[str, str], bytes]:
    head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), timeout=10)
    lines = head.decode("iso-8859-1").split("\r\n")
    method, path, _ = lines[0].split(" ", 2)
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.lower()] = value.strip()
    if secret is not None and not hmac.compare_digest(headers.get("x-vremix-bridge-secret", ""), secret):
        raise PermissionError("Invalid bridge secret.")
    if headers.get("transfer-encoding"):
        raise ValueError("Unsupported request framing.")
    length = int(headers.get("content-length", "0"))
    # Previous composition + face sheet + bounded server-resolved garment photos.
    if length < 0 or length > 32_000_000:
        raise ValueError("Request body is too large.")
    body = await asyncio.wait_for(reader.readexactly(length), timeout=20) if length else b""
    return f"{method} {path}", headers, body


async def image_bytes(image, directory: str, index: int) -> tuple[str, str]:
    filename = f"frame-{index}.png"
    saved = await image.save(path=directory, filename=filename, full_size=True)
    path = Path(saved)
    mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
    return mime_type, base64.b64encode(path.read_bytes()).decode("ascii")


async def generate(client: GeminiClient, payload: dict) -> dict:
    if payload.get("operation", "edit") not in {"base", "edit", "group", "group-edit", "review"}:
        raise ValueError("Unsupported operation.")
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        raise ValueError("prompt is required.")
    source = payload.get("sourceImage")
    source_files = []
    attachments = ([source] if isinstance(source, dict) and source.get("data") else [])
    references = payload.get("referenceImages") or []
    if not isinstance(references, list) or len(references) > 1:
        raise ValueError("At most one additional face reference sheet is allowed.")
    attachments.extend(references)
    garments = payload.get("garmentReferences") or []
    if not isinstance(garments, list) or len(garments) > 12:
        raise ValueError("At most twelve garment references are allowed.")
    garment_size = 0
    for garment in garments:
        if not isinstance(garment, dict) or not isinstance(garment.get("data"), str):
            raise ValueError("Invalid garment reference.")
        if len(garment["data"]) > 2_666_672:
            raise ValueError("Garment reference is too large.")
        decoded_size = len(base64.b64decode(garment["data"], validate=True))
        if decoded_size > 2_000_000:
            raise ValueError("Garment reference is too large.")
        garment_size += decoded_size
    if garment_size > 6_000_000:
        raise ValueError("Garment reference set is too large.")
    attachments.extend(garments)
    for attachment in attachments:
        if not isinstance(attachment, dict) or attachment.get("mimeType") not in ["image/png", "image/jpeg", "image/webp"]:
            raise ValueError("Invalid image attachment.")
        if not isinstance(attachment.get("data"), str) or len(attachment["data"]) > 11_200_000:
            raise ValueError("Image attachment is too large.")
        base64.b64decode(attachment["data"], validate=True)
    for attachment in attachments:
        # The upstream uploader assigns raw bytes a .txt filename. Gemini may
        # then treat the attachment as a document instead of an image, so
        # provide a real image suffix for image-to-image requests.
        suffix = {"image/jpeg": ".jpg", "image/webp": ".webp"}.get(attachment.get("mimeType"), ".png")
        source_file = tempfile.NamedTemporaryFile(prefix="vremix-source-", suffix=suffix)
        source_files.append(source_file)
        source_file.write(base64.b64decode(attachment["data"], validate=True))
        source_file.flush()
    files = [Path(file.name) for file in source_files] or None

    aspect = str(payload.get("aspectRatio") or "16:9")
    resolution = str(payload.get("targetResolution") or "1080")
    scope = str(payload.get("changeScope") or "preserve the source subject and composition")
    instruction = (
        f"The first attachment is the previous photograph to edit. Approved edit scope: {scope}. "
        "Preserve unchanged identities, faces, clothes, camera and composition unless the approved scope changes the scene or framing. "
        "If the people count changes, add/remove only the required people. "
        "Additional attachments are numbered face references only, except the final garment samples identified below; never reproduce their labels or layout. "
        if payload.get("operation") == "group-edit" else
        "Create ONE new group photograph as specified in the plan. "
        "The attached image, if any, is a numbered face reference sheet, NOT the output composition. "
        "Map each Person label to that person's face; never reproduce the sheet, its layout or labels. "
        if payload.get("operation") == "group"
        else f"Approved edit scope: {scope}. Preserve all other visual details. "
    )
    full_prompt = (
        "Generate an image, do not search for reference images. "
        f"Use a {aspect} canvas at a {resolution} delivery target. "
        + instruction +
        "No text, logo or watermark.\n\n" + prompt
    )
    if payload.get("operation") == "review":
        full_prompt = "Return JSON text only. Do not generate images or search the web.\n\n" + prompt
    if garments:
        full_prompt += (
            f"\nThe final {len(garments)} attachments are garment samples, NOT numbered face sheets. "
            "Use only their garment structure for the mapped people. Never copy sample faces, "
            "backgrounds or unselected accessories. Explicit plan color/pattern overrides take priority. "
            "When reviewing, compare the FIRST photograph with these final samples."
        )
    try:
        try:
            output = await asyncio.wait_for(
                client.generate_content(full_prompt, files=files, temporary=True),
                timeout=40 if payload.get("operation") == "review" else int(env("GEMINI_WEB_GENERATION_TIMEOUT_SECONDS", "85")),
            )
        except asyncio.TimeoutError as error:
            raise ProviderFailure("PROVIDER_TIMEOUT") from error
        if payload.get("operation") == "review":
            text = str(getattr(output, "text", "") or "").strip()
            if text.startswith("```"):
                text = "\n".join(text.splitlines()[1:-1]).strip()
            try:
                value = json.loads(text) if len(text) <= 20000 else None
                if not isinstance(value, dict):
                    raise ValueError("Not an object")
            except (ValueError, TypeError):
                raise ProviderFailure("PROVIDER_NO_TEXT") from None
            return {"text": json.dumps(value, ensure_ascii=False), "provider": "gemini-webapi"}
        generated = [image for image in output.images if type(image).__name__ == "GeneratedImage"]
        if not generated:
            response_text = " ".join(str(getattr(output, "text", "") or "").split())
            if "not signed in" in response_text.lower() or "need to sign in" in response_text.lower():
                raise ProviderFailure("PROVIDER_SESSION_EXPIRED")
            # Unavailable image creation can also mean account eligibility or
            # a refusal. Do not blindly renew/replay these provider responses.
            raise ProviderFailure("PROVIDER_NO_IMAGE")
        with tempfile.TemporaryDirectory(prefix="vremix-gemini-") as directory:
            images = []
            for index, image in enumerate(generated[:5], start=1):
                mime_type, data = await image_bytes(image, directory, index)
                images.append({"mimeType": mime_type, "data": data})
        return {"images": images, "provider": "gemini-webapi", "aspectRatio": aspect}
    finally:
        for source_file in source_files:
            source_file.close()


async def run() -> None:
    host = env("GEMINI_WEB_BRIDGE_HOST", "127.0.0.1")
    port = int(env("GEMINI_WEB_BRIDGE_PORT", "8788"))
    secret = env("GEMINI_WEB_BRIDGE_SECRET")
    env_path = Path(__file__).with_name(".env")
    cookie_values = {
        "GEMINI_WEB_SECURE_1PSID": env("GEMINI_WEB_SECURE_1PSID"),
        "GEMINI_WEB_SECURE_1PSIDTS": env("GEMINI_WEB_SECURE_1PSIDTS"),
    }
    cookie_values.update(sync_browser_session_cookies(env_path))
    if not secret:
        raise RuntimeError("Set GEMINI_WEB_BRIDGE_SECRET in services/gemini-webapi-bridge/.env.")
    if not cookie_values["GEMINI_WEB_SECURE_1PSID"]:
        raise RuntimeError(
            "Set GEMINI_WEB_SECURE_1PSID in services/gemini-webapi-bridge/.env. "
            "Do not paste this cookie into chat or commit it to Git."
        )

    client_timeout = int(env("GEMINI_WEB_TIMEOUT_SECONDS", "120"))
    auto_refresh = env("GEMINI_WEB_AUTO_REFRESH", "false").lower() in {"1", "true", "yes", "on"}
    proxy = env("GEMINI_WEB_PROXY") or None

    async def create_client() -> GeminiClient:
        cookie_values.update(sync_browser_session_cookies(env_path))
        fresh_client = GeminiClient(
            cookie_values["GEMINI_WEB_SECURE_1PSID"],
            cookie_values["GEMINI_WEB_SECURE_1PSIDTS"] or None,
            proxy=proxy,
        )
        await fresh_client.init(
            timeout=client_timeout,
            auto_close=False,
            auto_refresh=auto_refresh,
        )
        return fresh_client

    client = await create_client()
    client_lock = asyncio.Lock()

    async def renew_client() -> GeminiClient:
        nonlocal client
        previous = client
        try:
            await previous.close()
        except Exception:
            pass
        client = await create_client()
        return client

    async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            request, headers, body = await read_request(reader, secret)
            method, path = request.split(" ", 1)
            if not hmac.compare_digest(headers.get("x-vremix-bridge-secret", ""), secret):
                writer.write(response(401, {"error": "Invalid bridge secret."}))
            elif method == "GET" and urlparse(path).path == "/health":
                is_authenticated = client_is_authenticated(client)
                writer.write(response(
                    200 if is_authenticated else 503,
                    {
                        "ok": is_authenticated,
                        "authenticated": is_authenticated,
                        "provider": "gemini-webapi",
                        **({} if is_authenticated else {
                            **ProviderFailure("PROVIDER_SESSION_EXPIRED").body()
                        }),
                    },
                ))
            elif method == "POST" and urlparse(path).path == "/v1/images/generate":
                if client_lock.locked():
                    writer.write(response(429, {"code": "PROVIDER_BUSY", "error": "Bridge is busy. Retry explicitly later."}))
                    await writer.drain()
                    return
                async with client_lock:
                    generated = await generate_ready(client, json.loads(body), renew_client)
                writer.write(response(200, generated))
            else:
                writer.write(response(404, {"error": "Not found."}))
        except PermissionError:
            writer.write(response(401, {"error": "Invalid bridge secret."}))
        except (ValueError, asyncio.IncompleteReadError, asyncio.LimitOverrunError):
            writer.write(response(400, {"error": "Invalid bridge request."}))
        except ProviderFailure as error:
            print(f"Bridge failure: {error.code}", file=sys.stderr, flush=True)
            writer.write(response(error.status, error.body()))
        except Exception:
            # Upstream exception strings may contain cookies, tokens, URLs or
            # user prompts. Keep them out of HTTP bodies and production logs.
            print("Bridge failure: PROVIDER_UNAVAILABLE", file=sys.stderr, flush=True)
            failure = ProviderFailure("PROVIDER_UNAVAILABLE")
            writer.write(response(failure.status, failure.body()))
        finally:
            try:
                await writer.drain()
            except (BrokenPipeError, ConnectionResetError):
                pass
            writer.close()
            try:
                await writer.wait_closed()
            except (BrokenPipeError, ConnectionResetError):
                pass

    server = await asyncio.start_server(handle, host, port)
    addresses = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"Gemini web bridge listening on {addresses}", flush=True)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except Exception:
        print("Bridge startup failed. Check private session configuration and network access.", file=sys.stderr, flush=True)
        sys.exit(1)
