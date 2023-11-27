import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class Client(BaseModel):
    id: str
    name: str
    version: int = 1
    workspace_id: str
    for_workspace_id: Optional[str] = None
    api_id: str

    # size of the token bucket
    rate_limit_bucket_size: Optional[int] = None

    # amount of tokens to refill every interval
    rate_limit_refill_amount: Optional[int] = None

    # how often to refill tokens in milliseconds
    rate_limit_refill_interval: Optional[int] = None

    created_at: datetime.datetime

    model_config: ConfigDict = ConfigDict(from_attributes=True)


class ClientCreateResult(Client):
    secret: str


class BasicClientCreateParams(BaseModel):
    name: str
    workspace_id: str
    api_id: str
    rate_limit_bucket_size: Optional[int] = None
    rate_limit_refill_amount: Optional[int] = None
    rate_limit_refill_interval: Optional[int] = None


class BasicClientCreateReqBody(BaseModel):
    name: str
    api_id: str
    rate_limit_bucket_size: Optional[int] = None
    rate_limit_refill_amount: Optional[int] = None
    rate_limit_refill_interval: Optional[int] = None


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
    version: int
    secret_expires_at: Optional[
        datetime.datetime
    ] = None  # this is used for when secrets are rotated and the old secret has an expiration date


class Workspace(BaseModel):
    id: str
    name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class WorkspaceCreateParams(BaseModel):
    name: str


class WorkspaceCreateResult(Workspace):
    ...


class ApiScope(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime.datetime


class Api(BaseModel):
    id: str
    name: str
    workspace_id: str
    scopes: Optional[List[ApiScope]] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ApiScopeCreateParams(BaseModel):
    name: str
    description: str


class ApiCreateParams(BaseModel):
    name: str
    workspace_id: str
    scopes: Optional[List[ApiScopeCreateParams]] = None


class ApiCreateReqBody(BaseModel):
    name: str
    scopes: Optional[List[ApiScopeCreateParams]] = None


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


class BaseEvent(BaseModel):
    id: str
    timestamp: float


class SecretRotatedEventData(BaseModel):
    id: str


class SecretRotatedEvent(BaseEvent):
    event_type: Literal["secret.rotated"]
    data: SecretRotatedEventData


class SecretEvent(BaseModel):
    event: SecretRotatedEvent
