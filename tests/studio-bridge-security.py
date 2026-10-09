"""Offline HTTP framing/auth checks; no Google login or generation."""
import asyncio
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services/gemini-webapi-bridge'))
from server import read_request

async def parse(data, secret='fixture-secret'):
    reader = asyncio.StreamReader()
    reader.feed_data(data)
    reader.feed_eof()
    return await read_request(reader, secret)

async def test():
    req, headers, body = await parse(b'POST /v1/images/generate HTTP/1.0\r\nx-vremix-bridge-secret: fixture-secret\r\nContent-Length: 2\r\n\r\n{}')
    assert body == b'{}' and req == 'POST /v1/images/generate'
    for data, expected in [
        (b'POST / HTTP/1.0\r\nContent-Length: 20000000\r\n\r\n', PermissionError),
        (b'POST / HTTP/1.0\r\nx-vremix-bridge-secret: wrong\r\n\r\n', PermissionError),
        (b'POST / HTTP/1.0\r\nx-vremix-bridge-secret: fixture-secret\r\nContent-Length: 24000001\r\n\r\n', ValueError),
        (b'POST / HTTP/1.0\r\nx-vremix-bridge-secret: fixture-secret\r\nTransfer-Encoding: chunked\r\n\r\n', ValueError),
        (b'POST / HTTP/1.0\r\nx-vremix-bridge-secret: fixture-secret\r\nContent-Length: 4\r\n\r\n{}', asyncio.IncompleteReadError),
    ]:
        try: await parse(data)
        except expected: pass
        else: raise AssertionError('Unsafe framing/auth accepted')
    print('Bridge security: auth before body, wrong secret, size bounds, transfer framing and truncation passed offline.')

asyncio.run(test())
