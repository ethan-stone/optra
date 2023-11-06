import base64

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from ..db import Base, SqlAlchameyDb, get_db
from ..environment import Env, get_env
from ..main import app
from ..schemas import ClientCreateResult
from ..scripts.bootstrap import bootstrap

DATABASE_URL = "sqlite:///:memory:"


engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
    },
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)


def override_get_db():
    try:
        session = TestingSessionLocal()
        db = SqlAlchameyDb(session)
        yield db
    finally:
        session.close()


def override_get_env():
    return Env(jwt_secret="jwt_secret", internal_client_id="internal_client_id")


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_env] = override_get_env

SetupResult = ClientCreateResult


@pytest.fixture
def setup():
    Base.metadata.create_all(bind=engine)

    result = bootstrap(next(override_get_db()))

    yield result


def teardown():
    Base.metadata.drop_all(bind=engine)


def test_works_with_form_only(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.id,
        "client_secret": setup.secret,
    }

    response = client.post("/oauth/token", data=data)

    assert response.status_code == 200


def test_works_with_json_only(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
        "client_id": setup.id,
        "client_secret": setup.secret,
    }

    response = client.post("/oauth/token", json=data)

    assert response.status_code == 200


def test_works_with_part_form_part_basic_auth(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
    }

    b64_part = base64.b64encode((setup.id + ":" + setup.secret).encode()).decode(
        "utf-8"
    )

    headers = {
        "Authorization": f"basic {b64_part}",
    }

    response = client.post("/oauth/token", data=data, headers=headers)

    assert response.status_code == 200


def test_works_with_part_json_part_basic_auth(setup: SetupResult):
    data = {
        "grant_type": "client_credentials",
    }

    b64_part = base64.b64encode((setup.id + ":" + setup.secret).encode()).decode(
        "utf-8"
    )

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
        (setup.id + ":" + "wrong client secret").encode()
    ).decode("utf-8")

    headers = {
        "Authorization": f"basic {b64_part}",
    }

    response = client.post("/oauth/token", json=data, headers=headers)

    assert response.status_code == 400
