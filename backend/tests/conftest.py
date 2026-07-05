import os
import sys
import tempfile

import pytest

# Isolated database per test session, configured before the app is imported.
_db_dir = tempfile.mkdtemp(prefix="cognitive_inbox_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_dir}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_db_dir, "uploads")
os.environ["SECRET_KEY"] = "test-secret-key-0123456789abcdef0123456789abcdef"
os.environ.pop("GOOGLE_API_KEY", None)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.models import MemoProcessed, MemoType  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_gemini(monkeypatch):
    """Replace the Gemini call with a canned response. Yields the recorded calls."""
    calls = []

    def fake_analyze_content(text_input=None, file_data=None, mime_type=None,
                             available_tags=None, preferred_language=None):
        calls.append({
            "text_input": text_input,
            "mime_type": mime_type,
            "available_tags": available_tags,
            "preferred_language": preferred_language,
        })
        return MemoProcessed(
            original_input=text_input or f"[{mime_type}]",
            extracted_text=text_input or f"[{mime_type} Processed]",
            memo_types=[MemoType.TASK],
            summary="Buy groceries",
            action_items=["Buy milk"],
            tags=["shopping"],
            emotional_tone="Neutral",
            confidence_score=0.9,
        )

    monkeypatch.setattr("app.services.memo_service.analyze_content", fake_analyze_content)
    return calls


def register_user(client, email, password="password123"):
    response = client.post("/auth/register", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}
