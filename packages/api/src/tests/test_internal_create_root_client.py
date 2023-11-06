from ..main import TokenResponse
from .conftest import SetupResult, client


def test_should_reject_if_invalid_jwt():
    data = {
        "name": "test",
    }

    headers = {
        "Authoriation": "Bearer wef",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    assert response.status_code == 401


def test_should_reject_if_invalid_client(setup: SetupResult):
    internal_client, other_client = setup

    data = {
        "grant_type": "client_credentials",
        "client_id": other_client.id,
        "client_secret": other_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    print(token)

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    assert response.status_code == 401


def test_should_reject_if_invalid_body(setup: SetupResult):
    internal_client, other_client = setup

    data = {
        "grant_type": "client_credentials",
        "client_id": internal_client.id,
        "client_secret": internal_client.secret,
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
    internal_client, other_client = setup

    data = {
        "grant_type": "client_credentials",
        "client_id": internal_client.id,
        "client_secret": internal_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {"name": "test"}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    assert response.status_code == 200
