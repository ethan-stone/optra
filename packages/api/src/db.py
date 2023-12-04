import hashlib
import uuid
from datetime import datetime, timezone
from typing import Iterator, Protocol

from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .schemas import (
    Api,
    ApiCreateParams,
    ApiCreateResult,
    ApiScope,
    BasicClientCreateParams,
    Client,
    ClientCreateResult,
    ClientSecret,
    ClientSecretCreateResult,
    RootClientCreateParams,
    RotateClientSecretParams,
    Workspace,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
)

DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_utc_now():
    return datetime.now(timezone.utc)


class DbClient(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    workspace_id = Column(String, index=True, nullable=False)
    for_workspace_id = Column(String, index=True)
    api_id = Column(String, index=True, nullable=False)
    rate_limit_bucket_size = Column(Integer)
    rate_limit_refill_amount = Column(Integer)
    rate_limit_refill_interval = Column(Integer)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class DbClientSecret(Base):
    __tablename__ = "client_secrets"
    id = Column(String, primary_key=True, index=True, nullable=False)
    client_id = Column(String, index=True, nullable=False)
    secret = Column(String, unique=True, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, inactive
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class DbWorkspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, nullable=False)


class DbApi(Base):
    __tablename__ = "apis"
    id = Column(String, primary_key=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    workspace_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, nullable=False)


class DbApiScope(Base):
    """
    scopes that an api offers
    """

    __tablename__ = "api_scopes"

    id = Column(String, primary_key=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    api_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class ClientScope(Base):
    """
    scopes that a client has access to
    """

    __tablename__ = "client_scopes"

    id = Column(String, primary_key=True, index=True, nullable=False)
    client_id = Column(String, index=True, nullable=False)
    scope_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)


class Db(Protocol):
    def get_client(self, client_id: str) -> Client | None:
        ...

    def get_client_secrets_by_client_id(self, client_id: str) -> list[ClientSecret]:
        ...

    def get_client_secret_value(self, client_id: str) -> str | None:
        ...

    def rotate_client_secret(
        self, params: RotateClientSecretParams
    ) -> ClientSecretCreateResult:
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

    def get_client_secrets_by_client_id(self, client_id: str) -> list[ClientSecret]:
        secrets = (
            self.session.query(DbClientSecret)
            .filter(DbClientSecret.client_id == client_id)
            .all()
        )

        return list(
            map(
                lambda db_client_secret: ClientSecret(**db_client_secret.__dict__),
                secrets,
            )
        )

    def get_client_secret_value(self, secret_id: str) -> str | None:
        secret = (
            self.session.query(DbClientSecret)
            .filter(
                DbClientSecret.id == secret_id,
            )
            .first()
        )

        return secret.secret if secret is not None else None

    def rotate_client_secret(
        self, params: RotateClientSecretParams
    ) -> ClientSecretCreateResult:
        secret_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex

        hash = hashlib.sha256()
        hash.update(client_secret.encode())
        hashed_secret = hash.hexdigest()

        try:
            # make new secret
            db_secret = DbClientSecret(
                id=secret_id,
                secret=hashed_secret,
                client_id=params.client_id,
            )

            # update expiration of old secret
            old_secret = (
                self.session.query(DbClientSecret)
                .filter(DbClientSecret.client_id == params.client_id)
                .first()
            )

            old_secret.expires_at = params.expires_at

            # increment client version
            client = (
                self.session.query(DbClient)
                .filter(DbClient.id == params.client_id)
                .first()
            )
            client.version += 1

            self.session.add(db_secret)
            self.session.commit()
            self.session.refresh(db_secret)

            secret_dict = db_secret.__dict__
            secret_dict["secret"] = client_secret

            return ClientSecretCreateResult(**secret_dict)

        except:
            self.session.rollback()
            raise

    def create_root_client(self, client: RootClientCreateParams) -> ClientCreateResult:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex
        secret_id = uuid.uuid4().hex

        hash = hashlib.sha256()
        hash.update(client_secret.encode())
        hashed_secret = hash.hexdigest()

        try:
            self.session.begin_nested()

            db_client = DbClient(
                id=client_id,
                name=client.name,
                workspace_id=client.workspace_id,
                for_workspace_id=client.for_workspace_id,
                api_id=client.api_id,
                version=client.version,
            )

            db_secret = DbClientSecret(
                id=secret_id,
                secret=hashed_secret,
                client_id=client_id,
            )

            self.session.add(db_client)
            self.session.add(db_secret)
            self.session.commit()
            self.session.refresh(db_client)

            client_dict = db_client.__dict__

            # when creating a client, we don't want to return the hashed secret
            client_dict["secret"] = client_secret

            return ClientCreateResult(**client_dict)

        except:
            self.session.rollback()
            raise

    def create_basic_client(
        self, client: BasicClientCreateParams
    ) -> ClientCreateResult:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex
        secret_id = uuid.uuid4().hex

        hash = hashlib.sha256()
        hash.update(client_secret.encode())
        hashed_secret = hash.hexdigest()

        try:
            self.session.begin_nested()

            db_client = DbClient(
                id=client_id,
                name=client.name,
                version=client.version,
                workspace_id=client.workspace_id,
                api_id=client.api_id,
                rate_limit_bucket_size=client.rate_limit_bucket_size,
                rate_limit_refill_amount=client.rate_limit_refill_amount,
                rate_limit_refill_interval=client.rate_limit_refill_interval,
            )

            db_secret = DbClientSecret(
                id=secret_id,
                secret=hashed_secret,
                client_id=client_id,
            )

            self.session.add(db_client)
            self.session.add(db_secret)
            self.session.commit()
            self.session.refresh(db_client)

            client_dict = db_client.__dict__

            # when creating a client, we don't want to return the hashed secret
            client_dict["secret"] = client_secret

            return ClientCreateResult(**client_dict)

        except:
            self.session.rollback()
            raise

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

        try:
            self.session.begin_nested()

            db_api = DbApi(
                id=api_id,
                name=api.name,
                workspace_id=api.workspace_id,
            )

            self.session.add(db_api)

            db_api_scopes = (
                list(
                    map(
                        lambda api_scope: DbApiScope(
                            id=uuid.uuid4().hex,
                            name=api_scope.name,
                            description=api_scope.description,
                            api_id=api_id,
                        ),
                        api.scopes,
                    )
                )
                if api.scopes is not None and len(api.scopes) > 0
                else None
            )

            if db_api_scopes is not None:
                self.session.add_all(db_api_scopes)

            self.session.commit()
            self.session.refresh(db_api)

            api_scopes = (
                list(
                    map(
                        lambda db_api_scope: ApiScope(
                            id=db_api_scope.id,
                            name=db_api_scope.name,
                            description=db_api_scope.description,
                            created_at=db_api_scope.created_at,
                        ),
                        db_api_scopes,
                    )
                )
                if db_api_scopes is not None and len(db_api_scopes) > 0
                else None
            )

            return ApiCreateResult(**db_api.__dict__, scopes=api_scopes)

        except:
            self.session.rollback()
            raise

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


ClientsCache = dict[str, Client]

clients_cache: ClientsCache = {}


def get_clients_cache() -> ClientsCache:
    return clients_cache
