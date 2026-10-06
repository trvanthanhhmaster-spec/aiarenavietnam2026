"""Private HTTP bridge around HanaokaYuzu/Gemini-API.

The upstream project talks to the Gemini web app with Google session cookies.
It is intentionally kept behind a loopback listener and a shared secret; the
browser and the Supabase Edge Function must never receive those cookies.
"""

from __future__ import annotations

import asyncio
import base64
import json
import mimetypes
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from gemini_webapi import GeminiClient


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


async def read_request(reader: asyncio.StreamReader) -> tuple[str, dict[str, str], bytes]:
    head = await reader.readuntil(b"\r\n\r\n")
    lines = head.decode("iso-8859-1").split("\r\n")
    method, path, _ = lines[0].split(" ", 2)
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    if length > 12_000_000:
        raise ValueError("Request body is too large.")
    body = await reader.readexactly(length) if length else b""
    return f"{method} {path}", headers, body


async def image_bytes(image, directory: str, index: int) -> tuple[str, str]:
    filename = f"frame-{index}.png"
    saved = await image.save(path=directory, filename=filename, full_size=True)
    path = Path(saved)
    mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
    return mime_type, base64.b64encode(path.read_bytes()).decode("ascii")


async def generate(client: GeminiClient, payload: dict) -> dict:
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        raise ValueError("prompt is required.")
    source = payload.get("sourceImage")
    source_file = None
    files = None
    if isinstance(source, dict) and source.get("data"):
        # The upstream uploader assigns raw bytes a .txt filename. Gemini may
        # then treat the attachment as a document instead of an image, so
        # provide a real image suffix for image-to-image requests.
        suffix = {"image/jpeg": ".jpg", "image/webp": ".webp"}.get(source.get("mimeType"), ".png")
        source_file = tempfile.NamedTemporaryFile(prefix="vremix-source-", suffix=suffix)
        source_file.write(base64.b64decode(str(source["data"])))
        source_file.flush()
        files = [Path(source_file.name)]

    aspect = str(payload.get("aspectRatio") or "16:9")
    resolution = str(payload.get("targetResolution") or "1080")
    scope = str(payload.get("changeScope") or "preserve the source subject and composition")
    instruction = (
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
    try:
        try:
            output = await asyncio.wait_for(
                client.generate_content(full_prompt, files=files, temporary=True),
                timeout=int(env("GEMINI_WEB_GENERATION_TIMEOUT_SECONDS", "85")),
            )
        except asyncio.TimeoutError as error:
            raise RuntimeError(
                "Gemini Web image generation timed out. Retry explicitly when ready."
                if payload.get("operation") == "group"
                else "Gemini Web image generation timed out. The branch can safely fall back to frame A."
            ) from error
        generated = [image for image in output.images if type(image).__name__ == "GeneratedImage"]
        if not generated:
            response_text = " ".join(str(getattr(output, "text", "") or "").split())
            image_types = [type(image).__name__ for image in getattr(output, "images", [])]
            if "signed in" in response_text.lower() or "image creation isn't available" in response_text.lower():
                raise RuntimeError(
                    "Gemini Web session is unauthenticated or expired. "
                    "Refresh GEMINI_WEB_SECURE_1PSID and GEMINI_WEB_SECURE_1PSIDTS, then restart the bridge."
                )
            details = f" ({response_text[:240]})" if response_text else ""
            if image_types:
                details += f" [image types: {', '.join(image_types[:5])}]"
            raise RuntimeError("Gemini web returned no generated image." + details)
        with tempfile.TemporaryDirectory(prefix="vremix-gemini-") as directory:
            images = []
            for index, image in enumerate(generated[:5], start=1):
                mime_type, data = await image_bytes(image, directory, index)
                images.append({"mimeType": mime_type, "data": data})
        return {"images": images, "provider": "gemini-webapi", "aspectRatio": aspect}
    finally:
        if source_file is not None:
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

    def client_is_authenticated(value: GeminiClient) -> bool:
        return getattr(getattr(value, "account_status", None), "name", "") == "AVAILABLE"

    async def renew_client() -> GeminiClient:
        nonlocal client
        previous = client
        try:
            await previous.close()
        except Exception:
            pass
        client = await create_client()
        return client

    def looks_like_auth_error(error: Exception, value: GeminiClient) -> bool:
        message = str(error).lower()
        return (
            "permission denied" in message
            or "unauthenticated" in message
            or "session is not authenticated" in message
            or not client_is_authenticated(value)
        )

    async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            request, headers, body = await read_request(reader)
            method, path = request.split(" ", 1)
            if headers.get("x-vremix-bridge-secret") != secret:
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
                            "error": "Gemini Web session is unauthenticated or expired."
                        }),
                    },
                ))
            elif method == "POST" and urlparse(path).path == "/v1/images/generate":
                async with client_lock:
                    active_client = client
                    if not client_is_authenticated(active_client):
                        active_client = await renew_client()
                    try:
                        generated = await generate(active_client, json.loads(body))
                    except Exception as error:
                        # A long-lived Web session can be invalidated between
                        # frames. Re-authenticate once before surfacing the
                        # error so B-E have a chance to generate independently.
                        if not looks_like_auth_error(error, active_client):
                            raise
                        active_client = await renew_client()
                        generated = await generate(active_client, json.loads(body))
                writer.write(response(200, generated))
            else:
                writer.write(response(404, {"error": "Not found."}))
        except Exception as error:
            writer.write(response(502, {"error": str(error)[:500]}))
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
    asyncio.run(run())
