import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from ..db import Base, SqlAlchameyDb, get_db
from ..environment import Env, get_env
from ..main import app
from ..schemas import ClientCreateParams, ClientCreateResult
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

SetupResult = tuple[ClientCreateResult, ClientCreateResult]


@pytest.fixture
def setup():
    Base.metadata.create_all(bind=engine)

    db = next(override_get_db())

    internal_client = bootstrap(db)

    other_client = db.create_client(ClientCreateParams(name="test"))

    yield internal_client, other_client


def teardown():
    Base.metadata.drop_all(bind=engine)
