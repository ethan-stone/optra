from pydantic import BaseModel
import datetime


class Client(BaseModel):
    id: str
    secret: str
    name: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ClientCreate(BaseModel):
    name: str
