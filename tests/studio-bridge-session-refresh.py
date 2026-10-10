"""Offline refresh contracts. Synthetic cookies only; no real browser or network."""
import asyncio
import contextlib
import importlib.util
import io
from pathlib import Path
import runpy
import sqlite3
import stat
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import patch


source = Path(__file__).resolve().parents[1] / "services/gemini-webapi-bridge/refresh_session.py"
fake_server = SimpleNamespace(GeminiClient=None, client_is_authenticated=lambda client: client.authenticated,
                              env=lambda *args: "")
spec = importlib.util.spec_from_file_location("session_refresh_fixture", source)
refresh = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"server": fake_server}):
    spec.loader.exec_module(refresh)


def rejects(action, expected):
    try:
        action()
    except RuntimeError as error:
        assert str(error) == expected
    else:
        raise AssertionError("Expected sanitized failure")


with tempfile.TemporaryDirectory(prefix="vremix-refresh-test-") as folder:
    root = Path(folder)
    db = root / "Cookies"
    with sqlite3.connect(db) as connection:
        connection.execute("CREATE TABLE cookies(host_key, path, name, value, encrypted_value)")
        connection.executemany("INSERT INTO cookies VALUES(?,?,?,?,?)", [
            (".google.com", "/", name, "fixture-" + name, b"") for name in refresh.NAMES
        ] + [(".google.com", "/", "UNRELATED", "must-not-read", b""),
             ("other.example", "/", "__Secure-1PSID", "must-not-read", b"")])
    decrypted = []

    class CookieReader:
        def __init__(self, **kwargs):
            assert kwargs == {"cookie_file": str(db), "domain_name": ".google.com"}

        def _has_integrity_check_for_cookie_domain(self, connection):
            # The connection must be read-only.
            try:
                connection.execute("CREATE TABLE forbidden(x)")
            except sqlite3.OperationalError:
                return False
            raise AssertionError("Writable cookie connection")

        def _decrypt(self, value, encrypted, integrity):
            assert value.startswith("fixture-") and encrypted == b""
            decrypted.append(value)
            return value

        def load(self):
            raise AssertionError("Broad cookie loading forbidden")

    with patch.dict(sys.modules, {"browser_cookie3": SimpleNamespace(Chrome=CookieReader)}):
        pair = refresh.read_pair(db)
    assert len(decrypted) == 2 and set(pair) == set(refresh.NAMES.values())
    config = root / ".env"
    config.write_text("# keep\nUNRELATED=fixture-key\nGEMINI_WEB_SECURE_1PSID=old\n", encoding="utf-8")
    refresh.save_pair(config, pair)
    saved = config.read_text()
    assert "UNRELATED=fixture-key" in saved and "=old" not in saved
    assert stat.S_IMODE(config.stat().st_mode) == 0o600
    assert not list(root.glob(".session-refresh-*"))
    invalid = dict(pair)
    invalid["GEMINI_WEB_SECURE_1PSID"] = "line\nINJECTED=fixture"
    rejects(lambda: refresh.save_pair(config, invalid), "COOKIE_PAIR_INVALID")
    assert config.read_text() == saved
    link = root / "linked-config"
    link.symlink_to(config)
    rejects(lambda: refresh.save_pair(link, pair), "PRIVATE_CONFIG_UNAVAILABLE")

    async def auth_contract():
        calls = {"close": 0}

        class Client:
            authenticated = False

            def __init__(self, *args, **kwargs):
                pass

            async def init(self, **kwargs):
                assert kwargs == {"timeout": 20, "auto_close": False, "auto_refresh": False}

            async def close(self):
                calls["close"] += 1

        with patch.object(refresh, "read_pair", return_value=pair), \
             patch.object(refresh, "GeminiClient", Client), \
             patch.object(refresh, "save_pair") as save:
            try:
                await refresh.refresh()
            except RuntimeError as error:
                assert str(error) == "BROWSER_SESSION_UNAUTHENTICATED"
            else:
                raise AssertionError("Unauthenticated refresh accepted")
            save.assert_not_called()
            Client.authenticated = True
            await refresh.refresh()
            save.assert_called_once()
        assert calls["close"] == 2

    asyncio.run(auth_contract())

output = io.StringIO()
with patch.dict(sys.modules, {"server": fake_server}), patch.object(sys, "argv", [str(source)]), \
     contextlib.redirect_stderr(output):
    try:
        runpy.run_path(str(source), run_name="__main__")
    except SystemExit as error:
        assert error.code == 1
assert "Owner authorization required" in output.getvalue()
print("Session refresh: exact two-cookie read, private atomic save, no unauthenticated writes, explicit authorization; offline only.")
