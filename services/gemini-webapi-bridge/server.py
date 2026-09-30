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
    output = await client.generate_content(full_prompt, files=files, temporary=True)
    generated = [image for image in output.images if type(image).__name__ == "GeneratedImage"]
    if not generated:
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
    if not secret or not secure_1psid:
        raise RuntimeError(
            "Set GEMINI_WEB_BRIDGE_SECRET and GEMINI_WEB_SECURE_1PSID in services/gemini-webapi-bridge/.env."
        )

    client = GeminiClient(secure_1psid, secure_1psidts, proxy=env("GEMINI_WEB_PROXY") or None)
    await client.init(
        timeout=int(env("GEMINI_WEB_TIMEOUT_SECONDS", "120")),
        auto_close=False,
        auto_refresh=True,
    )

    async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            request, headers, body = await read_request(reader)
            method, path = request.split(" ", 1)
            if headers.get("x-vremix-bridge-secret") != secret:
                writer.write(response(401, {"error": "Invalid bridge secret."}))
            elif method == "GET" and urlparse(path).path == "/health":
                writer.write(response(200, {"ok": True, "provider": "gemini-webapi"}))
            elif method == "POST" and urlparse(path).path == "/v1/images/generate":
                writer.write(response(200, await generate(client, json.loads(body))))
            else:
                writer.write(response(404, {"error": "Not found."}))
        except Exception as error:
            writer.write(response(502, {"error": str(error)[:500]}))
        await writer.drain()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(handle, host, port)
    addresses = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"Gemini web bridge listening on {addresses}", flush=True)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(run())
