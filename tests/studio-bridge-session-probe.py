"""Offline auth-probe contract; fake credentials, zero upstream requests."""
import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/gemini-webapi-bridge"))
from check_session import probe


async def test():
    calls = {"init": 0, "close": 0}

    class Client:
        def __init__(self, *args, **kwargs):
            self.account_status = SimpleNamespace(name="AVAILABLE")

        async def init(self, **kwargs):
            assert kwargs == {"timeout": 20, "auto_close": False, "auto_refresh": False}
            calls["init"] += 1

        async def close(self):
            calls["close"] += 1

    with patch("check_session.env", return_value=""):
        result = await probe(Client)
        assert result["code"] == "SESSION_NOT_CONFIGURED" and calls["init"] == 0
    with patch("check_session.env", return_value="offline-fixture-not-a-cookie"):
        result = await probe(Client)
        assert result == {"authenticated": True, "code": "SESSION_AVAILABLE", "generationCalls": 0}

        class Expired(Client):
            async def init(self, **kwargs):
                self.account_status = SimpleNamespace(name="UNAUTHENTICATED")

        assert (await probe(Expired))["code"] == "PROVIDER_SESSION_EXPIRED"

        class Broken(Client):
            async def init(self, **kwargs):
                raise RuntimeError("sensitive-upstream-fixture")

        result = await probe(Broken)
        assert result["code"] == "AUTH_PROBE_UNAVAILABLE" and "sensitive" not in str(result)
    assert calls["close"] == 3
    print("Fresh session probe: no generation, bounded authentication, sanitized failures, clients closed.")


asyncio.run(test())
