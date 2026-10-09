"""Offline session/error tests; no login, upload, or provider requests."""
import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/gemini-webapi-bridge"))
from server import generate, generate_ready, ProviderFailure


async def test():
    available = SimpleNamespace(account_status=SimpleNamespace(name="AVAILABLE"))
    expired = SimpleNamespace(account_status=SimpleNamespace(name="UNAVAILABLE"))
    renewals = 0
    calls = 0

    async def renew_expired():
        nonlocal renewals
        renewals += 1
        return expired

    async def fake_generate(client, payload):
        nonlocal calls
        calls += 1
        return {"images": []}

    with patch("server.generate", fake_generate):
        try:
            await generate_ready(expired, {}, renew_expired)
        except ProviderFailure as error:
            assert error.code == "PROVIDER_SESSION_EXPIRED" and error.status == 503
        else:
            raise AssertionError("Expired session accepted")
        assert renewals == 1 and calls == 0, "Must fail before generation when renewal is unavailable"

    async def timeout(client, payload):
        client.account_status = SimpleNamespace(name="UNAVAILABLE")
        raise ProviderFailure("PROVIDER_TIMEOUT")

    with patch("server.generate", timeout):
        try:
            await generate_ready(available, {}, renew_expired)
        except ProviderFailure as error:
            assert error.code == "PROVIDER_TIMEOUT"
        assert renewals == 1, "Do not auto replay ambiguous timeouts"
    available.account_status = SimpleNamespace(name="AVAILABLE")

    async def renew_available():
        nonlocal renewals
        renewals += 1
        return available

    with patch("server.generate", fake_generate):
        await generate_ready(expired, {}, renew_available)
        assert calls == 1 and renewals == 2

    class TextClient:
        async def generate_content(self, *args, **kwargs):
            return SimpleNamespace(images=[], text="private user prompt fixture")

    try:
        await generate(TextClient(), {"prompt": "offline only", "operation": "group"})
    except ProviderFailure as error:
        assert error.code == "PROVIDER_NO_IMAGE"
        assert "private" not in str(error.body())
    print("Bridge readiness: expired renewal fails before generation, single recovery, no timeout replay, safe errors passed offline.")


asyncio.run(test())
