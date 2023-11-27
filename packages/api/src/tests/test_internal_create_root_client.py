from ..main import TokenResponse
from .conftest import SetupResult, client


def test_should_reject_if_invalid_jwt():
    data = {
        "name": "test",
    }

    headers = {
        "Authorization": "Bearer wef",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    assert response.status_code == 401


def test_should_reject_if_invalid_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    assert response.status_code == 401


def test_should_reject_if_invalid_body(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.internal_client.id,
        "client_secret": setup.internal_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    assert response.status_code == 422


def test_should_create_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.internal_client.id,
        "client_secret": setup.internal_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    data = {"name": "test"}

    response = client.post("/v1/internal.createWorkspace", json=data, headers=headers)
    response_json = response.json()

    data = {
        "name": "test root client",
        "for_workspace_id": response_json["id"],
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)
    response_json = response.json()

    assert response.status_code == 200
    assert response_json["name"] == "test root client"
    assert response_json["workspace_id"] == setup.internal_workspace.id
    assert response_json["for_workspace_id"] == data["for_workspace_id"]
    assert response_json["api_id"] == setup.internal_api.id
    assert response_json["version"] == 1
