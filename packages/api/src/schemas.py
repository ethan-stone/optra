import datetime
from typing import Optional

from pydantic import BaseModel


class Client(BaseModel):
    id: str
    name: str
    rate_limit_bucket_size: Optional[int]
    rate_limit_refill_amount: Optional[int]
    rate_limit_refill_interval: Optional[int]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ClientCreateResult(Client):
    secret: str


class ClientCreate(BaseModel):
    name: str


class VerifyClient(BaseModel):
    token: str
