import datetime
import hashlib
import uuid
from typing import Iterator, Protocol

from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .schemas import (
    Client,
    ClientCreateParams,
    ClientCreateResult,
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
    secret = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    rate_limit_bucket_size = Column(Integer)
    rate_limit_refill_amount = Column(Integer)
    rate_limit_refill_interval = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.now, nullable=False)


class DbWorkspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.now, nullable=False)


class Db(Protocol):
    def get_client(self, client_id: str) -> Client | None:
        ...

    def create_client(self, client: ClientCreateParams) -> ClientCreateResult:
        ...

    def create_workspace(self, client: WorkspaceCreateParams) -> WorkspaceCreateResult:
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

    def create_client(self, client: ClientCreateParams) -> ClientCreateResult:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex

        hash = hashlib.sha256()
        hash.update(client_secret.encode())
        hashed_secret = hash.hexdigest()

        db_client = DbClient(
            id=client_id,
            secret=hashed_secret,
            name=client.name,
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


def get_db() -> Iterator[Db]:
    session = SessionLocal()
    db = SqlAlchameyDb(session)

    try:
        yield db
    finally:
        session.close()
