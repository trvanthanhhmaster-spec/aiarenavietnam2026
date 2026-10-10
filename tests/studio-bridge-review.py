"""Offline structured review contract. Never calls Google or uploads images."""
import asyncio
import base64
from pathlib import Path
from types import SimpleNamespace
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services/gemini-webapi-bridge'))
from server import generate, ProviderFailure

async def test():
    class Client:
        async def generate_content(self, prompt, files, temporary, current_retry):
            assert current_retry == 0
            assert prompt.startswith('Return JSON text only.')
            assert 'Generate an image' not in prompt
            assert temporary is True and files[0].read_bytes() == b'owned-generated-image'
            self.file = files[0]
            return SimpleNamespace(text='```json\n{"story":"fixture"}\n```', images=[])
    client=Client()
    result=await generate(client, {'operation':'review','prompt':'Review fixture only','sourceImage':{'mimeType':'image/png','data':base64.b64encode(b'owned-generated-image').decode()}})
    assert result['text']=='{"story": "fixture"}' and 'images' not in result
    assert not client.file.exists()
    class Invalid:
        async def generate_content(self,*args,**kwargs):return SimpleNamespace(text='private upstream response',images=[])
    try:await generate(Invalid(),{'operation':'review','prompt':'offline'})
    except ProviderFailure as e:assert e.code=='PROVIDER_NO_TEXT' and 'private' not in str(e.body())
    else:raise AssertionError('Invalid review accepted')
    print('Bridge review: JSON-only, no generation instruction, source cleanup and safe invalid-text failure passed offline.')
asyncio.run(test())
