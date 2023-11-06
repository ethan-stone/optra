from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

from .authorizer import JwtPayload, internal_authorizer, root_authorizer
from .db import Db, get_db
from .environment import Env, get_env
from .schemas import (
    ApiCreateParams,
    ApiCreateReqBody,
    ClientCreateResult,
    RootClientCreateParams,
    RootClientCreateReqBody,
    WorkspaceCreateParams,
)

v1 = APIRouter(prefix="/v1")


class ClientParams(BaseModel):
    name: str


@v1.post("/internal.createRootClient", response_model=ClientCreateResult)
def create_root_client(
    client_params: Annotated[RootClientCreateReqBody, Body()],
    db: Annotated[Db, Depends(get_db)],
    env: Annotated[Env, Depends(get_env)],
    _: Annotated[JwtPayload, Depends(internal_authorizer)],
):
    client = db.create_root_client(
        RootClientCreateParams(
            api_id=env.internal_api_id,
            workspace_id=env.internal_workspace_id,
            for_workspace_id=client_params.for_workspace_id,
            name=client_params.name,
        )
    )

    return client


@v1.post("/internal.createWorkspace")
def create_workspace(
    workspace_params: Annotated[WorkspaceCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
    _: Annotated[JwtPayload, Depends(internal_authorizer)],
):
    workspace = db.create_workspace(workspace_params)

    return workspace


@v1.post("/apis.createApi")
def create_api(
    api_params: Annotated[ApiCreateReqBody, Body()],
    db: Annotated[Db, Depends(get_db)],
    jwt: Annotated[JwtPayload, Depends(root_authorizer)],
):
    client = db.get_client(jwt.sub)

    if client is None:
        print("Somehow jwt sub is not a client that exists")
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

    api = db.create_api(
        ApiCreateParams(
            name=api_params.name,
            workspace_id=client.for_workspace_id,
        )
    )

    return api
