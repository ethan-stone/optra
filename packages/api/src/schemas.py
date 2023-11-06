import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class Client(BaseModel):
    id: str
    name: str
    workspace_id: str
    for_workspace_id: Optional[str] = None
    rate_limit_bucket_size: Optional[int] = None
    rate_limit_refill_amount: Optional[int] = None
    rate_limit_refill_interval: Optional[int] = None
    created_at: datetime.datetime

    model_config: ConfigDict = ConfigDict(from_attributes=True)


class ClientCreateResult(Client):
    secret: str


class BasicCreateClientParams(BaseModel):
    name: str
    workspace_id: str


class RootClientCreateParams(BasicCreateClientParams):
    for_workspace_id: str


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
