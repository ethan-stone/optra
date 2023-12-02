"""
This tests the internal authorizer function located in packages/api/src/authorizer.py

The internal authorizer function is reused across any internal.* calls, so we just need
to pick one internal call to test. In this case internal.createRootClient is used.
"""


from datetime import datetime, timedelta, timezone

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

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 401
    assert response_json["detail"] == "BAD_JWT"


def test_should_reject_if_expired_jwt(setup: SetupResult):
    jwt_payload = JwtPayload(
        sub=setup.internal_client.id,
        exp=datetime.now(timezone.utc) - timedelta(days=1),
        iat=datetime.now(timezone.utc),
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
        "client_id": setup.internal_client.id,
        "client_secret": setup.internal_client.secret,
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

    response_json = response.json()

    assert response.status_code == 403
    assert response_json["detail"] == "Forbidden"


def test_should_reject_if_version_mismatch(setup: SetupResult):
    # manually make token that is version 0
    jwt_payload = JwtPayload(
        sub=setup.internal_client.id,
        exp=datetime.now(timezone.utc) + timedelta(days=1),
        iat=datetime.now(timezone.utc),
        version=0,
    )

    token = jwt.encode(jwt_payload.model_dump(), "jwt_secret", algorithm="HS256")

    data = {
        "name": "test",
    }

    headers = {
        "Authorization": f"Bearer {token}",
    }

    response = client.post("/v1/internal.createRootClient", json=data, headers=headers)

    response_json = response.json()

    assert response.status_code == 401
    assert response_json["detail"] == "VERSION_MISMATCH"
