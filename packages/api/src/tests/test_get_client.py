from ..main import TokenResponse
from .conftest import SetupResult, client


def test_should_reject_if_invalid_query(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    # missing client_id
    params = {}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.get("/v1/clients.getClient", params=params, headers=headers)

    assert response.status_code == 422


def test_should_reject_if_client_id_does_not_exist(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    params = {
        "client_id": "wefwf",
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.get("/v1/clients.getClient", params=params, headers=headers)

    assert response.status_code == 404


def test_should_reject_if_no_access_to_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    params = {"client_id": setup.internal_client.id}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.get("/v1/clients.getClient", params=params, headers=headers)

    assert response.status_code == 404


def test_should_successfully_return_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    params = {"client_id": setup.basic_client_without_rate_limit.id}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.get("/v1/clients.getClient", params=params, headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["id"] == setup.basic_client_without_rate_limit.id
