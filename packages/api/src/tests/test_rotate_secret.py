from ..main import TokenResponse
from .conftest import SetupResult, client


def test_should_reject_if_invalid_body(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    # missing client id
    data = {}

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/clients.rotateSecret", json=data, headers=headers)

    assert response.status_code == 422


def test_should_rotate_secret(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.root_client.id,
        "client_secret": setup.root_client.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    data = {
        "client_id": setup.basic_client_without_rate_limit.id,
    }

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    old_version = setup.basic_client_without_rate_limit.version

    response = client.post("/v1/clients.rotateSecret", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["client_id"] == setup.basic_client_without_rate_limit.id

    updated_client = client.get(
        "/v1/clients.getClient",
        params={"client_id": setup.basic_client_without_rate_limit.id},
        headers=headers,
    )

    updated_client_json = updated_client.json()

    assert updated_client_json["id"] == setup.basic_client_without_rate_limit.id
    assert updated_client_json["version"] == old_version + 1
