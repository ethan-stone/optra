import datetime
import uuid
from typing import Protocol

from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from .schemas import Client, ClientCreateParams, ClientCreateResult

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

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


class Db(Protocol):
    def get_client(self, client_id: str) -> Client | None:
        ...

    def create_client(self, name: str) -> ClientCreateResult:
        ...


class SqlAlchameyDb:
    def __init__(self, session: Session):
        self.session = session

    def get_client(self, client_id: str) -> DbClient | None:
        client = self.session.query(DbClient).filter(DbClient.id == client_id).first()
        return Client(**client.__dict__) if client else None

    def create_client(self, client: ClientCreateParams) -> ClientCreateResult | None:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex

        db_client = DbClient(
            id=client_id,
            secret=client_secret,
            name=client.name,
        )
        self.session.add(db_client)
        self.session.commit()
        self.session.refresh(db_client)
        return ClientCreateResult(**db_client.__dict__)


def get_db() -> Db:
    session = SessionLocal()
    db = SqlAlchameyDb(session)

    try:
        yield db
    finally:
        session.close()
