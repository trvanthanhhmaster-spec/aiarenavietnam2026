"""CLI-only fresh auth probe using stored config; never generates or copies cookies."""
import asyncio
import json
from server import GeminiClient, client_is_authenticated, env


async def probe(client_factory=GeminiClient):
    if not env("GEMINI_WEB_SECURE_1PSID"):
        return {"authenticated": False, "code": "SESSION_NOT_CONFIGURED", "generationCalls": 0}
    client = client_factory(env("GEMINI_WEB_SECURE_1PSID"), env("GEMINI_WEB_SECURE_1PSIDTS") or None,
                            proxy=env("GEMINI_WEB_PROXY") or None)
    try:
        await asyncio.wait_for(client.init(timeout=20, auto_close=False, auto_refresh=False), timeout=25)
        authenticated = client_is_authenticated(client)
        return {"authenticated": authenticated,
                "code": "SESSION_AVAILABLE" if authenticated else "PROVIDER_SESSION_EXPIRED",
                "generationCalls": 0}
    except Exception:
        # Do not expose upstream exceptions, tokens, cookies or request URLs.
        return {"authenticated": False, "code": "AUTH_PROBE_UNAVAILABLE", "generationCalls": 0}
    finally:
        try:
            await client.close()
        except Exception:
            pass


if __name__ == "__main__":
    result = asyncio.run(probe())
    print(json.dumps(result))
    raise SystemExit(0 if result["authenticated"] else 1)
