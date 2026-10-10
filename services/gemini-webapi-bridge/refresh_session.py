"""Owner-authorized, two-cookie Chrome refresh. No history, profile copy or generation."""
import asyncio
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
from urllib.parse import quote

from server import GeminiClient, client_is_authenticated, env

NAMES = {"__Secure-1PSID": "GEMINI_WEB_SECURE_1PSID", "__Secure-1PSIDTS": "GEMINI_WEB_SECURE_1PSIDTS"}


def validate_pair(values):
    if set(values) != set(NAMES.values()) or any(
        not isinstance(value, str) or not value or len(value) > 8192
        or any(ord(c) < 33 or ord(c) > 126 for c in value)
        for value in values.values()
    ):
        raise RuntimeError("COOKIE_PAIR_INVALID")


def read_pair(path):
    import browser_cookie3
    if not path.is_file():
        raise RuntimeError("COOKIE_FILE_UNAVAILABLE")
    # Specify exactly one configured DB; do not discover or copy profiles.
    reader = browser_cookie3.Chrome(cookie_file=str(path), domain_name=".google.com")
    connection = sqlite3.connect("file:" + quote(str(path)) + "?mode=ro", uri=True, timeout=5)
    try:
        integrity = reader._has_integrity_check_for_cookie_domain(connection)
        rows = connection.execute(
            "SELECT name, value, encrypted_value FROM cookies WHERE host_key=? AND path=? AND name IN (?,?)",
            (".google.com", "/", *NAMES)).fetchall()
        if len(rows) != 2 or {row[0] for row in rows} != set(NAMES):
            raise RuntimeError("COOKIE_PAIR_UNAVAILABLE")
        result = {NAMES[name]: reader._decrypt(value, encrypted, integrity) for name, value, encrypted in rows}
        validate_pair(result)
        return result
    finally:
        connection.close()


def save_pair(path, values):
    if path.is_symlink() or not path.is_file():
        raise RuntimeError("PRIVATE_CONFIG_UNAVAILABLE")
    validate_pair(values)
    lines = path.read_text(encoding="utf-8").splitlines()
    lines = [line for line in lines if line.split("=", 1)[0].strip() not in values]
    lines.extend(key + "=" + values[key] for key in NAMES.values())
    # Private temp file and atomic replacement; never log the values.
    fd, temporary = tempfile.mkstemp(prefix=".session-refresh-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write("\n".join(lines) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


async def refresh():
    configured = env("GEMINI_WEB_CHROME_COOKIE_FILE")
    path = Path(configured).expanduser() if configured else (
        Path.home() / "Library/Application Support/Google/Chrome" / env("GEMINI_WEB_CHROME_PROFILE", "Default") / "Cookies")
    values = read_pair(path)
    client = GeminiClient(values["GEMINI_WEB_SECURE_1PSID"], values["GEMINI_WEB_SECURE_1PSIDTS"], proxy=env("GEMINI_WEB_PROXY") or None)
    try:
        await asyncio.wait_for(client.init(timeout=20, auto_close=False, auto_refresh=False), timeout=25)
        if not client_is_authenticated(client):
            raise RuntimeError("BROWSER_SESSION_UNAUTHENTICATED")
        save_pair(Path(__file__).with_name(".env"), values)
    finally:
        await client.close()


if __name__ == "__main__":
    if "--owner-authorized" not in sys.argv:
        print("Owner authorization required; no cookies read.", file=sys.stderr)
        raise SystemExit(1)
    try:
        asyncio.run(refresh())
        print("Two-cookie private config refreshed after authentication; generation calls: 0.")
    except Exception as error:
        allowed = {"COOKIE_FILE_UNAVAILABLE", "COOKIE_PAIR_UNAVAILABLE", "COOKIE_PAIR_INVALID", "PRIVATE_CONFIG_UNAVAILABLE", "BROWSER_SESSION_UNAUTHENTICATED"}
        code = str(error) if isinstance(error, RuntimeError) and str(error) in allowed else "PRIVATE_REFRESH_UNAVAILABLE"
        print("Session refresh: " + code + "; no values printed or generation called.", file=sys.stderr)
        raise SystemExit(1)
