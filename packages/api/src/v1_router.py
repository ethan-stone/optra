from typing import Annotated

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from .authorizer import JwtPayload, internal_authorizer
from .db import Db, get_db
from .schemas import ClientCreateParams, ClientCreateResult, WorkspaceCreateParams

v1 = APIRouter(prefix="/v1")


class ClientParams(BaseModel):
    name: str


@v1.post("/internal.createRootClient", response_model=ClientCreateResult)
def create_root_client(
    client_params: Annotated[ClientCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
    _: Annotated[JwtPayload, Depends(internal_authorizer)],
):
    client = db.create_client(client_params)

    return client


@v1.post("/internal.createWorkspace")
def create_workspace(
    workspace_params: Annotated[WorkspaceCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
    _: Annotated[JwtPayload, Depends(internal_authorizer)],
):
    workspace = db.create_workspace(workspace_params)

    return workspace
