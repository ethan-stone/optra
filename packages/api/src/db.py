import datetime
import hashlib
import uuid
from typing import Iterator, Protocol

from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .schemas import (
    Api,
    ApiCreateParams,
    ApiCreateResult,
    BasicClientCreateParams,
    Client,
    ClientCreateResult,
    RootClientCreateParams,
    Workspace,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
)

DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class DbClient(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True)
    secret = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    workspace_id = Column(String, index=True, nullable=False)
    for_workspace_id = Column(String, index=True)
    api_id = Column(String, index=True, nullable=False)
    rate_limit_bucket_size = Column(Integer)
    rate_limit_refill_amount = Column(Integer)
    rate_limit_refill_interval = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class DbWorkspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class DbApi(Base):
    __tablename__ = "apis"
    id = Column(String, primary_key=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    workspace_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class Db(Protocol):
    def get_client(self, client_id: str) -> Client | None:
        ...

    def get_client_secret(self, client_id: str) -> str | None:
        ...

    def create_root_client(self, client: RootClientCreateParams) -> ClientCreateResult:
        ...

    def create_basic_client(
        self, client: BasicClientCreateParams
    ) -> ClientCreateResult:
        ...

    def create_workspace(self, client: WorkspaceCreateParams) -> WorkspaceCreateResult:
        ...

    def get_workspace(self, workspace_id: str) -> Workspace | None:
        ...

    def create_api(self, client: ApiCreateParams) -> ApiCreateResult:
        ...

    def get_api(self, api_id: str) -> Api | None:
        ...


class SqlAlchameyDb:
    def __init__(self, session: Session):
        self.session = session

    def get_client(self, client_id: str) -> DbClient | None:
        client = self.session.query(DbClient).filter(DbClient.id == client_id).first()
        return Client(**client.__dict__) if client else None

    def get_client_secret(self, client_id: str) -> str | None:
        client = self.session.query(DbClient).filter(DbClient.id == client_id).first()
        return client.secret if client else None

    def create_root_client(self, client: RootClientCreateParams) -> ClientCreateResult:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex

        hash = hashlib.sha256()
        hash.update(client_secret.encode())
        hashed_secret = hash.hexdigest()

        db_client = DbClient(
            id=client_id,
            secret=hashed_secret,
            name=client.name,
            workspace_id=client.workspace_id,
            for_workspace_id=client.for_workspace_id,
            api_id=client.api_id,
        )

        self.session.add(db_client)
        self.session.commit()
        self.session.refresh(db_client)

        client_dict = db_client.__dict__

        # when creating a client, we don't want to return the hashed secret
        client_dict["secret"] = client_secret

        return ClientCreateResult(**client_dict)

    def create_basic_client(
        self, client: BasicClientCreateParams
    ) -> ClientCreateResult:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex

        hash = hashlib.sha256()
        hash.update(client_secret.encode())
        hashed_secret = hash.hexdigest()

        db_client = DbClient(
            id=client_id,
            secret=hashed_secret,
            name=client.name,
            workspace_id=client.workspace_id,
            api_id=client.api_id,
            rate_limit_bucket_size=client.rate_limit_bucket_size,
            rate_limit_refill_amount=client.rate_limit_refill_amount,
            rate_limit_refill_interval=client.rate_limit_refill_interval,
        )

        self.session.add(db_client)
        self.session.commit()
        self.session.refresh(db_client)

        client_dict = db_client.__dict__

        # when creating a client, we don't want to return the hashed secret
        client_dict["secret"] = client_secret

        return ClientCreateResult(**client_dict)

    def create_workspace(
        self, workspace: WorkspaceCreateParams
    ) -> WorkspaceCreateResult:
        workspace_id = uuid.uuid4().hex

        db_workspace = DbWorkspace(
            id=workspace_id,
            name=workspace.name,
        )
        self.session.add(db_workspace)
        self.session.commit()
        self.session.refresh(db_workspace)

        return WorkspaceCreateResult(**db_workspace.__dict__)

    def get_workspace(self, workspace_id: str) -> Workspace | None:
        workspace = (
            self.session.query(DbWorkspace)
            .filter(DbWorkspace.id == workspace_id)
            .first()
        )
        return Workspace(**workspace.__dict__) if workspace else None

    def create_api(self, api: ApiCreateParams) -> ApiCreateResult:
        api_id = uuid.uuid4().hex

        db_api = DbApi(
            id=api_id,
            name=api.name,
            workspace_id=api.workspace_id,
        )
        self.session.add(db_api)
        self.session.commit()
        self.session.refresh(db_api)

        return ApiCreateResult(**db_api.__dict__)

    def get_api(self, api_id: str) -> Api | None:
        api = self.session.query(DbApi).filter(DbApi.id == api_id).first()
        return Api(**api.__dict__) if api else None


def get_db() -> Iterator[Db]:
    session = SessionLocal()
    db = SqlAlchameyDb(session)

    try:
        yield db
    finally:
        session.close()
