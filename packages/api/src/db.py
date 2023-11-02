from typing import Protocol

from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import datetime
from .schemas import ClientCreate
import uuid

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True)
    secret = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.now)


class Db(Protocol):
    def get_client(self, client_id: str) -> Client | None:
        ...

    def create_client(self, name: str) -> Client:
        ...


class SqlAlchameyDb:
    def __init__(self, session: Session):
        self.session = session

    def get_client(self, client_id: str) -> Client | None:
        return self.session.query(Client).filter(Client.id == client_id).first()

    def create_client(self, client: ClientCreate) -> Client | None:
        client_id = uuid.uuid4().hex
        client_secret = uuid.uuid4().hex

        db_client = Client(
            id=client_id,
            secret=client_secret,
            name=client.name,
        )
        self.session.add(db_client)
        self.session.commit()
        self.session.refresh(db_client)
        return db_client


def get_db() -> Db:
    session = SessionLocal()
    db = SqlAlchameyDb(session)

    try:
        yield db
    finally:
        session.close()
