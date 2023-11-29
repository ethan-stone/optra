from ..main import TokenResponse
from .conftest import SetupResult, client


def test_should_reject_if_invalid_jwt():
    data = {
        "name": "test",
    }

    headers = {
        "Authorization": "Bearer wef",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    assert response.status_code == 401


def test_should_reject_if_not_root_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client_with_rate_limit_exceeded.id,
        "client_secret": setup.basic_client_with_rate_limit_exceeded.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 403
    assert response_json["detail"] == "Forbidden"


def test_should_reject_if_invalid_body(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    assert response.status_code == 422


def test_should_create_api(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test api",
        "scopes": [
            {"name": "write:test", "description": "write test"},
            {"name": "read:test", "description": "read test"},
        ],
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["name"] == "test api"
    assert response_json["workspace_id"] == setup.root_client.for_workspace_id
    assert response_json["scopes"][0]["name"] == "write:test"
    assert response_json["scopes"][0]["description"] == "write test"
    assert response_json["scopes"][1]["name"] == "read:test"
    assert response_json["scopes"][1]["description"] == "read test"
