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
    files = None
    if isinstance(source, dict) and source.get("data"):
        files = [base64.b64decode(str(source["data"]))]

    aspect = str(payload.get("aspectRatio") or "16:9")
    resolution = str(payload.get("targetResolution") or "1080")
    scope = str(payload.get("changeScope") or "preserve the source subject and composition")
    full_prompt = (
        "Generate an image, do not search for reference images. "
        f"Use a {aspect} canvas at a {resolution} delivery target. "
        f"Approved edit scope: {scope}. Preserve all other visual details. "
        "No text, logo or watermark.\n\n" + prompt
    )
    try:
        output = await asyncio.wait_for(
            client.generate_content(full_prompt, files=files, temporary=True),
            timeout=int(env("GEMINI_WEB_GENERATION_TIMEOUT_SECONDS", "85")),
        )
    except asyncio.TimeoutError as error:
        raise RuntimeError(
            "Gemini Web image generation timed out. The branch can safely fall back to frame A."
        ) from error
    generated = [image for image in output.images if type(image).__name__ == "GeneratedImage"]
    if not generated:
        response_text = str(getattr(output, "text", "") or "").strip()
        if "signed in" in response_text.lower() or "image creation isn't available" in response_text.lower():
            raise RuntimeError(
                "Gemini Web session is unauthenticated or expired. "
                "Refresh GEMINI_WEB_SECURE_1PSID and GEMINI_WEB_SECURE_1PSIDTS, then restart the bridge."
            )
        raise RuntimeError("Gemini web returned no generated image.")
    with tempfile.TemporaryDirectory(prefix="vremix-gemini-") as directory:
        images = []
        for index, image in enumerate(generated[:5], start=1):
            mime_type, data = await image_bytes(image, directory, index)
            images.append({"mimeType": mime_type, "data": data})
    return {"images": images, "provider": "gemini-webapi", "aspectRatio": aspect}


async def run() -> None:
    host = env("GEMINI_WEB_BRIDGE_HOST", "127.0.0.1")
    port = int(env("GEMINI_WEB_BRIDGE_PORT", "8788"))
    secret = env("GEMINI_WEB_BRIDGE_SECRET")
    secure_1psid = env("GEMINI_WEB_SECURE_1PSID")
    secure_1psidts = env("GEMINI_WEB_SECURE_1PSIDTS")
    if not secret:
        raise RuntimeError("Set GEMINI_WEB_BRIDGE_SECRET in services/gemini-webapi-bridge/.env.")
    if not secure_1psid:
        raise RuntimeError(
            "Set GEMINI_WEB_SECURE_1PSID in services/gemini-webapi-bridge/.env. "
            "Do not paste this cookie into chat or commit it to Git."
        )

    client_timeout = int(env("GEMINI_WEB_TIMEOUT_SECONDS", "120"))
    proxy = env("GEMINI_WEB_PROXY") or None

    async def create_client() -> GeminiClient:
        fresh_client = GeminiClient(secure_1psid, secure_1psidts, proxy=proxy)
        await fresh_client.init(
            timeout=client_timeout,
            auto_close=False,
            auto_refresh=True,
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
