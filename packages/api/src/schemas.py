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


class ClientCreateParams(BaseModel):
    name: str


class VerifyClientParams(BaseModel):
    token: str


class JwtPayload(BaseModel):
    sub: str
    iat: datetime.datetime
    exp: datetime.datetime