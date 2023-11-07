from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from .authorizer import (
    BasicAuthorizerResult,
    JwtPayload,
    basic_authorizer,
    internal_authorizer,
    root_authorizer,
)
from .db import Db, get_db
from .environment import Env, get_env
from .schemas import (
    ApiCreateParams,
    ApiCreateReqBody,
    ApiCreateResult,
    BasicClientCreateParams,
    BasicClientCreateReqBody,
    ClientCreateResult,
    RootClientCreateParams,
    RootClientCreateReqBody,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
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
    workspace = db.get_workspace(client_params.for_workspace_id)

    if workspace is None:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST, detail="workspace not found"
        )

    logger.info(f"fetched workspace {workspace}")

    client = db.create_root_client(
        RootClientCreateParams(
            api_id=env.internal_api_id,
            workspace_id=env.internal_workspace_id,
            for_workspace_id=client_params.for_workspace_id,
            name=client_params.name,
        )
    )

    logger.info(f"created root client {client.id}")

    return client


@v1.post("/internal.createWorkspace", response_model=WorkspaceCreateResult)
def create_workspace(
    workspace_params: Annotated[WorkspaceCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
    _: Annotated[JwtPayload, Depends(internal_authorizer)],
):
    workspace = db.create_workspace(workspace_params)

    logger.info(f"created workspace {workspace.id}")

    return workspace


@v1.post("/apis.createApi", response_model=ApiCreateResult)
def create_api(
    api_params: Annotated[ApiCreateReqBody, Body()],
    db: Annotated[Db, Depends(get_db)],
    jwt: Annotated[JwtPayload, Depends(root_authorizer)],
):
    client = db.get_client(jwt.sub)

    if client is None:
        print("Somehow jwt sub is not a client that exists")
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

    logger.info(f"fetched client {client.id}")

    api = db.create_api(
        ApiCreateParams(
            name=api_params.name,
            workspace_id=client.for_workspace_id,
        )
    )

    logger.info(f"created api {api.id}")

    return api


@v1.post("/clients.createClient", response_model=ClientCreateResult)
def create_basic_client(
    client_params: Annotated[BasicClientCreateReqBody, Body()],
    db: Annotated[Db, Depends(get_db)],
    jwt: Annotated[JwtPayload, Depends(root_authorizer)],
):
    root_client = db.get_client(jwt.sub)

    if root_client is None:
        print("Somehow jwt sub is not a client that exists")
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

    logger.info(f"fetched client {root_client.id}")

    api = db.get_api(client_params.api_id)

    if api is None or api.workspace_id != root_client.for_workspace_id:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="api not found")

    basic_client = db.create_basic_client(
        BasicClientCreateParams(
            api_id=client_params.api_id,
            workspace_id=api.workspace_id,
            name=client_params.name,
        )
    )

    logger.info(f"created basic client {basic_client.id}")

    return basic_client


@v1.post("/tokens.verifyToken", response_model=BasicAuthorizerResult)
def verify_token(
    authorize_result: Annotated[BasicAuthorizerResult, Depends(basic_authorizer)],
):
    logger.info("token verified")

    return authorize_result
