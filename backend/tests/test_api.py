import io

from conftest import auth_header, register_user


class TestAuth:
    def test_register_returns_token_and_user(self, client):
        data = register_user(client, "alice@example.com")
        assert data["access_token"]
        assert data["user"]["email"] == "alice@example.com"

    def test_register_duplicate_email_rejected(self, client):
        register_user(client, "dupe@example.com")
        response = client.post(
            "/auth/register", json={"email": "dupe@example.com", "password": "password123"}
        )
        assert response.status_code == 400

    def test_register_weak_password_rejected(self, client):
        response = client.post(
            "/auth/register", json={"email": "weak@example.com", "password": "short"}
        )
        assert response.status_code == 422

    def test_login_and_me(self, client):
        register_user(client, "bob@example.com")
        response = client.post(
            "/auth/login", json={"email": "bob@example.com", "password": "password123"}
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        me = client.get("/auth/me", headers=auth_header(token))
        assert me.status_code == 200
        assert me.json()["email"] == "bob@example.com"

    def test_login_wrong_password_rejected(self, client):
        register_user(client, "carol@example.com")
        response = client.post(
            "/auth/login", json={"email": "carol@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401


class TestAuthRequired:
    def test_memos_requires_auth(self, client):
        assert client.get("/memos/").status_code == 401

    def test_collections_requires_auth(self, client):
        assert client.get("/collections").status_code == 401

    def test_capture_requires_auth(self, client):
        assert client.post("/memos/capture", data={"text": "hi"}).status_code == 401

    def test_invalid_token_rejected(self, client):
        response = client.get("/memos/", headers=auth_header("not-a-real-token"))
        assert response.status_code == 401


class TestMemos:
    def test_capture_and_fetch_text_memo(self, client, mock_gemini):
        token = register_user(client, "memo-user@example.com")["access_token"]

        response = client.post(
            "/memos/capture",
            data={"text": "buy milk tomorrow", "available_tags": "[]"},
            headers=auth_header(token),
        )
        assert response.status_code == 200, response.text
        memo = response.json()
        assert memo["summary"] == "Buy groceries"
        assert memo["memo_types"] == ["Task"]

        listed = client.get("/memos/", headers=auth_header(token))
        assert listed.status_code == 200
        assert len(listed.json()) == 1

    def test_memo_update_and_delete(self, client, mock_gemini):
        token = register_user(client, "memo-editor@example.com")["access_token"]
        memo = client.post(
            "/memos/capture",
            data={"text": "note", "available_tags": "[]"},
            headers=auth_header(token),
        ).json()

        updated = client.put(
            f"/memos/{memo['id']}",
            json={"summary": "Edited summary"},
            headers=auth_header(token),
        )
        assert updated.status_code == 200
        assert updated.json()["summary"] == "Edited summary"

        deleted = client.delete(f"/memos/{memo['id']}", headers=auth_header(token))
        assert deleted.status_code == 200
        assert client.get("/memos/", headers=auth_header(token)).json() == []

    def test_users_cannot_see_each_others_memos(self, client, mock_gemini):
        token_a = register_user(client, "isolation-a@example.com")["access_token"]
        token_b = register_user(client, "isolation-b@example.com")["access_token"]

        memo = client.post(
            "/memos/capture",
            data={"text": "secret note", "available_tags": "[]"},
            headers=auth_header(token_a),
        ).json()

        assert client.get("/memos/", headers=auth_header(token_b)).json() == []

        # Cross-user mutation attempts must 404
        assert (
            client.delete(f"/memos/{memo['id']}", headers=auth_header(token_b)).status_code == 404
        )
        assert (
            client.put(
                f"/memos/{memo['id']}", json={"summary": "hacked"}, headers=auth_header(token_b)
            ).status_code
            == 404
        )

    def test_preferred_language_reaches_gemini(self, client, mock_gemini):
        token = register_user(client, "linguist@example.com")["access_token"]
        response = client.post(
            "/memos/capture",
            data={"text": "记得买牛奶", "available_tags": "[]", "preferred_language": "zh"},
            headers=auth_header(token),
        )
        assert response.status_code == 200, response.text
        assert mock_gemini[-1]["preferred_language"] == "zh"

    def test_upload_rejects_unsupported_mime_type(self, client, mock_gemini):
        token = register_user(client, "uploader@example.com")["access_token"]
        response = client.post(
            "/memos/capture",
            files={"file": ("evil.html", io.BytesIO(b"<script>alert(1)</script>"), "text/html")},
            data={"available_tags": "[]"},
            headers=auth_header(token),
        )
        assert response.status_code == 415

    def test_upload_accepts_image(self, client, mock_gemini):
        token = register_user(client, "imager@example.com")["access_token"]
        response = client.post(
            "/memos/capture",
            files={"file": ("photo.png", io.BytesIO(b"\x89PNG fake image"), "image/png")},
            data={"available_tags": "[]"},
            headers=auth_header(token),
        )
        assert response.status_code == 200, response.text


class TestAccountDeletion:
    def test_delete_account_removes_everything(self, client, mock_gemini):
        token = register_user(client, "goodbye@example.com")["access_token"]
        client.post(
            "/memos/capture",
            data={"text": "note to be erased", "available_tags": "[]"},
            headers=auth_header(token),
        )

        response = client.delete("/auth/me", headers=auth_header(token))
        assert response.status_code == 200

        # Token no longer works (user gone)
        assert client.get("/memos/", headers=auth_header(token)).status_code == 401
        # Login is gone too
        assert (
            client.post(
                "/auth/login",
                json={"email": "goodbye@example.com", "password": "password123"},
            ).status_code
            == 401
        )
        # Email can be re-registered fresh with empty data
        new_token = register_user(client, "goodbye@example.com")["access_token"]
        assert client.get("/memos/", headers=auth_header(new_token)).json() == []

    def test_delete_account_leaves_other_users_intact(self, client, mock_gemini):
        token_stay = register_user(client, "stayer@example.com")["access_token"]
        token_go = register_user(client, "leaver@example.com")["access_token"]
        client.post(
            "/memos/capture",
            data={"text": "keep me", "available_tags": "[]"},
            headers=auth_header(token_stay),
        )

        client.delete("/auth/me", headers=auth_header(token_go))

        remaining = client.get("/memos/", headers=auth_header(token_stay)).json()
        assert len(remaining) == 1


class TestCollections:
    def test_default_collections_seeded_on_register(self, client):
        token = register_user(client, "collector@example.com")["access_token"]
        response = client.get("/collections", headers=auth_header(token))
        assert response.status_code == 200
        titles = {c["title"] for c in response.json()}
        assert {"Memo", "Task", "Wishlist"} <= titles

    def test_custom_collection_crud_and_isolation(self, client):
        token_a = register_user(client, "coll-a@example.com")["access_token"]
        token_b = register_user(client, "coll-b@example.com")["access_token"]

        created = client.post(
            "/collections", params={"title": "Recipes"}, headers=auth_header(token_a)
        )
        assert created.status_code == 200, created.text
        collection_id = created.json()["id"]

        titles_b = {c["title"] for c in client.get("/collections", headers=auth_header(token_b)).json()}
        assert "Recipes" not in titles_b

        # Other users cannot delete it
        assert (
            client.delete(f"/collections/{collection_id}", headers=auth_header(token_b)).status_code
            == 404
        )
        assert (
            client.delete(f"/collections/{collection_id}", headers=auth_header(token_a)).status_code
            == 200
        )
