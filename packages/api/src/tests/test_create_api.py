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

    assert response.status_code == 401


def test_should_reject_if_invalid_body(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())
    print(token.access_token)

    data = {}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    assert response.status_code == 422


def tes_should_create_api(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())
    print(token.access_token)

    data = {"name": "test api"}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["name"] == "test"
    assert response_json["workspace_id"] == setup.root_client.for_workspace_id
