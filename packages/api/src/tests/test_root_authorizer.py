"""
This tests the root authorizer function located in packages/api/src/authorizer.py

The root authorizer function is reused across a number of api calls, so we just need
to pick one api call to test. In this case apis.createApi is used.
"""

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