import datetime
from unittest.mock import Mock

import jwt
import pytest
from pytest_mock import MockerFixture

from ..main import TokenResponse
from ..schemas import JwtPayload
from .conftest import SetupResult, client


@pytest.fixture
def mock_jwt_decode_expired(mocker: MockerFixture):
    mock = Mock()
    mocker.patch(
        "jwt.decode",
        return_value=mock,
        side_effect=jwt.exceptions.ExpiredSignatureError(),
    )


@pytest.fixture
def mock_jwt_decode_invalid(mocker: MockerFixture):
    mock = Mock()
    mocker.patch(
        "jwt.decode",
        return_value=mock,
        side_effect=jwt.exceptions.InvalidSignatureError(),
    )


def test_should_be_invalid_if_invalid_jwt(setup: SetupResult):
    headers = {
        "Authorization": "Bearer wef",
    }

    response = client.post("/v1/tokens.verifyToken", headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is False
    assert response_json["reason"] == "BAD_JWT"


def test_should_be_invalid_if_expired(setup: SetupResult, mock_jwt_decode_expired):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client_with_rate_limit_exceeded.id,
        "client_secret": setup.basic_client_with_rate_limit_exceeded.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/tokens.verifyToken", headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is False
    assert response_json["reason"] == "EXPIRED"


def test_should_be_invalid_if_invalid_signature(
    setup: SetupResult, mock_jwt_decode_invalid
):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client_with_rate_limit_exceeded.id,
        "client_secret": setup.basic_client_with_rate_limit_exceeded.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/tokens.verifyToken", headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is False
    assert response_json["reason"] == "INVALID_SIGNATURE"


def test_should_be_invalid_if_not_found(setup: SetupResult):
    # token signed with correct secret but for a client that doesn't exist
    jwt_payload = JwtPayload(
        sub="fake client",
        exp=datetime.datetime.now() + datetime.timedelta(days=1),
        iat=datetime.datetime.now(),
        version=1,
    )

    token = jwt.encode(jwt_payload.model_dump(), "jwt_secret", algorithm="HS256")

    headers = {
        "Authorization": f"Bearer {token}",
    }

    response = client.post(
        "/v1/tokens.verifyToken", headers=headers, json={"token": "wef"}
    )

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is False
    assert response_json["reason"] == "NOT_FOUND"


def test_should_be_valid_if_no_rate_limit_configured(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client_without_rate_limit.id,
        "client_secret": setup.basic_client_without_rate_limit.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/tokens.verifyToken", headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is True


def test_should_be_invalid_if_rate_limit_exceeded(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client_with_rate_limit_exceeded.id,
        "client_secret": setup.basic_client_with_rate_limit_exceeded.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/tokens.verifyToken", headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is False
    assert response_json["reason"] == "RATE_LIMIT_EXCEEDED"


def test_should_be_valid_if_rate_limit_not_exceeded(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.basic_client_with_rate_limit_not_exceeded.id,
        "client_secret": setup.basic_client_with_rate_limit_not_exceeded.secret,
    }

    token_response = client.post("/oauth/token", json=data)

    token = TokenResponse(**token_response.json())

    headers = {
        "Authorization": f"Bearer {token.access_token}",
    }

    response = client.post("/v1/tokens.verifyToken", headers=headers)

    response_json = response.json()

    assert response.status_code == 200
    assert response_json["valid"] is True
