"""Offline bridge contract: never logs in, uploads, or calls Gemini."""
import asyncio
import base64
from pathlib import Path
import sys
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services/gemini-webapi-bridge"))
from server import generate


class FakeClient:
    async def generate_content(self, prompt, files, temporary, current_retry):
        assert current_retry == 0
        assert "ONE new group photograph" in prompt
        assert "NOT the output composition" in prompt
        assert "Preserve all other visual details" not in prompt
        assert temporary is True
        assert len(files) == 1 and files[0].suffix == ".jpg"
        assert files[0].read_bytes() == b"offline-fixture"
        self.temporary_path = files[0]
        return SimpleNamespace(images=[], text="No offline image")


async def test():
    client = FakeClient()
    try:
        await generate(client, {
            "operation": "group", "prompt": "Exactly 2 people, assigned outfits.",
            "sourceImage": {"mimeType": "image/jpeg", "data": base64.b64encode(b"offline-fixture").decode()},
        })
    except RuntimeError as error:
        assert "no generated image" in str(error)
    else:
        raise AssertionError("No generated images must be a real failure, not a fallback")
    assert not client.temporary_path.exists(), "Source reference must be removed even on failure"
    class EditClient:
        async def generate_content(self, prompt, files, temporary, current_retry):
            assert current_retry == 0
            assert "first attachment is the previous photograph to edit" in prompt
            assert "Additional attachments are numbered face references" in prompt
            assert "ONE new group photograph" not in prompt
            assert len(files) == 2
            assert files[0].read_bytes() == b"previous-image"
            assert files[1].read_bytes() == b"new-face"
            self.paths = list(files)
            return SimpleNamespace(images=[], text="Offline only")
    edit_client = EditClient()
    try:
        await generate(edit_client, {
            "operation": "group-edit", "prompt": "Change only bag.",
            "sourceImage": {"mimeType": "image/png", "data": base64.b64encode(b"previous-image").decode()},
            "referenceImages": [{"mimeType": "image/jpeg", "data": base64.b64encode(b"new-face").decode()}],
        })
    except RuntimeError:
        pass
    assert all(not path.exists() for path in edit_client.paths)
    print("Group bridge: face-sheet instructions, correct source MIME, explicit failure and temporary-file cleanup passed offline.")


asyncio.run(test())
