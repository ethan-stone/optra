import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from ..db import Base, SqlAlchameyDb, get_db
from ..environment import Env, get_env
from ..main import app
from ..schemas import ClientCreateResult, RootClientCreateParams, WorkspaceCreateResult
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


app.dependency_overrides[get_db] = override_get_db


class SetupResult(BaseModel):
    internal_client: ClientCreateResult
    root_client: ClientCreateResult
    internal_workspace: WorkspaceCreateResult


@pytest.fixture
def setup():
    Base.metadata.create_all(bind=engine)

    db = next(override_get_db())

    internal_workspace, internal_client = bootstrap(db)

    other_client = db.create_root_client(
        RootClientCreateParams(
            name="test",
            workspace_id=internal_workspace.id,
            for_workspace_id=internal_workspace.id,
        )
    )

    def override_get_env():
        return Env(jwt_secret="jwt_secret", internal_client_id=internal_client.id)

    app.dependency_overrides[get_env] = override_get_env

    yield SetupResult(
        internal_client=internal_client,
        root_client=other_client,
        internal_workspace=internal_workspace,
    )


def teardown():
    Base.metadata.drop_all(bind=engine)
