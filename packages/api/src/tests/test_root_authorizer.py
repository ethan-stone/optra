"""
This tests the root authorizer function located in packages/api/src/authorizer.py

The root authorizer function is reused across a number of api calls, so we just need
to pick one api call to test. In this case apis.createApi is used.
"""

import datetime

import jwt

from ..main import TokenResponse
from ..schemas import JwtPayload
from .conftest import SetupResult, client


def test_should_reject_if_invalid_jwt():
    data = {
        "name": "test",
    }

    headers = {
        "Authorization": "Bearer wef",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 401
    assert response_json["detail"] == "BAD_JWT"


def test_should_reject_if_expired_jwt(setup: SetupResult):
    jwt_payload = JwtPayload(
        sub=setup.root_client.id,
        exp=datetime.datetime.now() - datetime.timedelta(days=1),
        iat=datetime.datetime.now(),
        version=1,
    )

    token = jwt.encode(jwt_payload.model_dump(), "jwt_secret", algorithm="HS256")

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 401
    assert response_json["detail"] == "EXPIRED"


def test_should_reject_if_invalid_signature(setup: SetupResult):
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
        "Authorization": f"Bearer {token.access_token}randomcharacters",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 401
    assert response_json["detail"] == "INVALID_SIGNATURE"


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


def test_should_reject_if_version_mismatch(setup: SetupResult):
    # manually make token that is version 0
    jwt_payload = JwtPayload(
        sub=setup.root_client.id,
        exp=datetime.datetime.now() + datetime.timedelta(days=1),
        iat=datetime.datetime.now(),
        version=0,
    )

    token = jwt.encode(jwt_payload.model_dump(), "jwt_secret", algorithm="HS256")

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token}",
    }

    response = client.post("/v1/apis.createApi", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 401
    assert response_json["detail"] == "VERSION_MISMATCH"
