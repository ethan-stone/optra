import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class Client(BaseModel):
    id: str
    name: str
    workspace_id: str
    for_workspace_id: Optional[str] = None
    api_id: str
    rate_limit_bucket_size: Optional[int] = None
    rate_limit_refill_amount: Optional[int] = None
    rate_limit_refill_interval: Optional[int] = None
    created_at: datetime.datetime

    model_config: ConfigDict = ConfigDict(from_attributes=True)


class ClientCreateResult(Client):
    secret: str


class BasicClientCreateParams(BaseModel):
    name: str
    workspace_id: str
    api_id: str


class BasicClientCreateReqBody(BaseModel):
    name: str
    api_id: str


class RootClientCreateParams(BasicClientCreateParams):
    for_workspace_id: str


class RootClientCreateReqBody(BaseModel):
    for_workspace_id: str
    name: str


class VerifyClientParams(BaseModel):
    token: str


class JwtPayload(BaseModel):
    sub: str
    iat: datetime.datetime
    exp: datetime.datetime


class Workspace(BaseModel):
    id: str
    name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class WorkspaceCreateParams(BaseModel):
    name: str


class WorkspaceCreateResult(Workspace):
    ...


class Api(BaseModel):
    id: str
    name: str
    workspace_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ApiCreateParams(BaseModel):
    name: str
    workspace_id: str


class ApiCreateReqBody(BaseModel):
    name: str


class ApiCreateResult(Api):
    ...


class InvalidReasons(str, Enum):
    EXPIRED = "EXPIRED"
    INVALID_SIGNATURE = "INVALID_SIGNATURE"
    BAD_JWT = "BAD_JWT"
    NOT_FOUND = "NOT_FOUND"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"


class BasicAuthorizerResult(BaseModel):
    valid: bool
    reason: Optional[InvalidReasons] = None
