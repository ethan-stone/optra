from ..main import TokenResponse
from .conftest import SetupResult, client


def test_should_reject_if_invalid_jwt():
    data = {
        "name": "test",
    }

    headers = {
        "Authorization": "Bearer wef",
    }

    response = client.post("/v1/clients.createClient", json=data, headers=headers)

    assert response.status_code == 401


def test_should_reject_if_invalid_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client.id,
        "client_secret": setup.basic_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/clients.createClient", json=data, headers=headers)

    assert response.status_code == 401


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

    response = client.post("/v1/clients.createClient", json=data, headers=headers)

    assert response.status_code == 422


def test_should_reject_if_api_id_does_not_exist(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test",
        "api_id": "wefwf",
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/clients.createClient", json=data, headers=headers)

    assert response.status_code == 400


def test_should_reject_if_api_id_does_not_belong_to_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test",
        "api_id": setup.internal_api.id,
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/clients.createClient", json=data, headers=headers)

    assert response.status_code == 400


def test_should_create_client(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "name": "test",
        "api_id": setup.root_api.id,
        "rate_limit_bucket_size": 10,
        "rate_limit_refill_amount": 2,
        "rate_limit_refill_interval": 200,
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/clients.createClient", json=data, headers=headers)
    response_json = response.json()

    assert response.status_code == 200
    assert response_json["name"] == "test"
    assert response_json["workspace_id"] == setup.root_workspace.id
    assert response_json["api_id"] == setup.root_api.id
    assert response_json["rate_limit_bucket_size"] == 10
    assert response_json["rate_limit_refill_amount"] == 2
    assert response_json["rate_limit_refill_interval"] == 200
