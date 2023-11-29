import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from ..db import Base, SqlAlchameyDb, get_db
from ..environment import Env, get_env
from ..main import app
from ..schemas import (
    ApiCreateParams,
    ApiCreateResult,
    BasicClientCreateParams,
    ClientCreateResult,
    RootClientCreateParams,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
)
from ..scripts.bootstrap import bootstrap
from ..token_bucket import Buckets, TokenBucket, get_token_buckets

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
    internal_workspace: WorkspaceCreateResult
    internal_api: ApiCreateResult
    internal_client: ClientCreateResult
    root_workspace: WorkspaceCreateResult
    root_api: ApiCreateResult
    root_client: ClientCreateResult
    basic_client_with_rate_limit_exceeded: ClientCreateResult
    basic_client_with_rate_limit_not_exceeded: ClientCreateResult
    basic_client_without_rate_limit: ClientCreateResult


@pytest.fixture
def setup():
    Base.metadata.create_all(bind=engine)

    db = next(override_get_db())

    internal_workspace, internal_api, internal_client = bootstrap(db)

    root_workspace = db.create_workspace(
        WorkspaceCreateParams(
            name="root workspace",
        )
    )

    root_client = db.create_root_client(
        RootClientCreateParams(
            name="root client",
            workspace_id=internal_workspace.id,
            for_workspace_id=root_workspace.id,
            api_id=internal_api.id,
            version=2,
        )
    )

    root_api = db.create_api(
        ApiCreateParams(
            name="root api",
            workspace_id=root_workspace.id,
        )
    )

    basic_client_with_rate_limit_exceeded = db.create_basic_client(
        BasicClientCreateParams(
            name="test",
            workspace_id=root_workspace.id,
            api_id=root_api.id,
            rate_limit_bucket_size=10,
            rate_limit_refill_amount=2,
            rate_limit_refill_interval=200,
            version=2,
        )
    )

    basic_client_with_rate_limit_not_exceeded = db.create_basic_client(
        BasicClientCreateParams(
            name="test",
            workspace_id=root_workspace.id,
            api_id=root_api.id,
            rate_limit_bucket_size=10,
            rate_limit_refill_amount=2,
            rate_limit_refill_interval=200,
            version=2,
        )
    )

    basic_client_without_rate_limit = db.create_basic_client(
        BasicClientCreateParams(
            name="test",
            workspace_id=root_workspace.id,
            api_id=root_api.id,
            version=2,
        )
    )

    def override_get_env():
        return Env(
            jwt_secret="jwt_secret",
            internal_client_id=internal_client.id,
            internal_client_secret=internal_client.secret,
            internal_api_id=internal_api.id,
            internal_workspace_id=internal_workspace.id,
            logflare_api_key="logflare_api_key",
            logflare_source_id="logflare_source_id",
        )

    app.dependency_overrides[get_env] = override_get_env

    def override_get_token_buckets() -> Buckets:
        return {
            basic_client_with_rate_limit_exceeded.id: TokenBucket(0, 0, 2, 0),
            basic_client_with_rate_limit_not_exceeded.id: TokenBucket(10, 2, 200, 10),
        }

    app.dependency_overrides[get_token_buckets] = override_get_token_buckets

    yield SetupResult(
        internal_workspace=internal_workspace,
        internal_api=internal_api,
        internal_client=internal_client,
        root_client=root_client,
        root_workspace=root_workspace,
        root_api=root_api,
        basic_client_with_rate_limit_exceeded=basic_client_with_rate_limit_exceeded,
        basic_client_with_rate_limit_not_exceeded=basic_client_with_rate_limit_not_exceeded,
        basic_client_without_rate_limit=basic_client_without_rate_limit,
    )


def teardown():
    Base.metadata.drop_all(bind=engine)
