import base64

from .conftest import SetupResult, client


def test_works_with_form_only(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.internal_client.id,
        "client_secret": setup.internal_client.secret,
    }

    response = client.post("/oauth/token", data=data)

    assert response.status_code == 200


def test_works_with_json_only(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.internal_client.id,
        "client_secret": setup.internal_client.secret,
    }

    response = client.post("/oauth/token", json=data)

    assert response.status_code == 200


def test_works_with_part_form_part_basic_auth(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
    }

    b64_part = base64.b64encode(
        (setup.internal_client.id + ":" + setup.internal_client.secret).encode()
    ).decode("utf-8")

    headers = {
        "Authorization": f"basic {b64_part}",
    }

    response = client.post("/oauth/token", data=data, headers=headers)

    assert response.status_code == 200


def test_works_with_part_json_part_basic_auth(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
    }

    b64_part = base64.b64encode(
        (setup.internal_client.id + ":" + setup.internal_client.secret).encode()
    ).decode("utf-8")

    headers = {
        "Authorization": f"basic {b64_part}",
    }

    response = client.post("/oauth/token", json=data, headers=headers)

    assert response.status_code == 200


def test_responds_bad_request_if_missing_params():
    data = {
        "grant_type": "client_credentials",
    }

    response = client.post("/oauth/token", data=data)

    assert response.status_code == 400


def test_responds_bad_request_if_wrong_client_id():
    data = {
        "grant_type": "client_credentials",
    }

    b64_part = base64.b64encode(
        ("wrong client id" + ":" + "wrong client secret").encode()
    ).decode("utf-8")

    headers = {
        "Authorization": f"basic {b64_part}",
    }

    response = client.post("/oauth/token", json=data, headers=headers)

    assert response.status_code == 400


def test_responds_bad_request_if_incorrect_param(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
    }

    b64_part = base64.b64encode(
        (setup.internal_client.id + ":" + "wrong client secret").encode()
    ).decode("utf-8")

    headers = {
        "Authorization": f"basic {b64_part}",
    }

    response = client.post("/oauth/token", json=data, headers=headers)

    assert response.status_code == 400
