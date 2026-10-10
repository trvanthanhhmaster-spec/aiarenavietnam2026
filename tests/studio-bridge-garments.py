"""Offline multi-image role/order contract. No login, upload or provider invocation."""
import asyncio
import base64
from pathlib import Path
from types import SimpleNamespace
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services/gemini-webapi-bridge'))
from server import generate, ProviderFailure

def image(data):
    return {'mimeType':'image/jpeg','data':base64.b64encode(data).decode()}

async def test():
    for operation in ['group', 'group-edit', 'review']:
        class Client:
            async def generate_content(self, prompt, files, temporary, current_retry):
                assert current_retry == 0
                assert [p.read_bytes() for p in files] == [b'source',b'face-sheet',b'garment-one',b'garment-two']
                assert 'final 2 attachments are garment samples' in prompt
                assert 'Never copy sample faces' in prompt and temporary
                self.paths=list(files)
                return SimpleNamespace(text='{"fixture":true}' if operation=='review' else 'Offline only',images=[])
        client=Client()
        try:
            await generate(client,{'operation':operation,'prompt':'offline mapping',
                'sourceImage':image(b'source'),'referenceImages':[image(b'face-sheet')],
                'garmentReferences':[image(b'garment-one'),image(b'garment-two')]})
        except ProviderFailure as error:
            assert operation != 'review' and error.code=='PROVIDER_NO_IMAGE'
        assert all(not p.exists() for p in client.paths)
    class Never:
        async def generate_content(self,*args,**kwargs):raise AssertionError('Invalid set reached provider')
    for refs in [[image(b'x')]*13,[image(b'x'*2_000_001)],['bad']]:
        try:await generate(Never(),{'operation':'group','prompt':'offline','garmentReferences':refs})
        except ValueError:pass
        else:raise AssertionError('Unbounded references accepted')
    print('Garment bridge: source/face/sample order, generation and review roles, bounds and cleanup passed offline.')

asyncio.run(test())
