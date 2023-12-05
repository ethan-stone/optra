from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query
from loguru import logger
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from .authorizer import (
    JwtPayload,
    basic_authorizer,
    internal_authorizer,
    root_authorizer,
)
from .db import Db, get_db
from .environment import Env, get_env
from .pubsub import Publisher, get_publisher
from .schemas import (
    ApiCreateParams,
    ApiCreateReqBody,
    ApiCreateResult,
    BasicAuthorizerResult,
    BasicClientCreateParams,
    BasicClientCreateReqBody,
    Client,
    ClientCreateResult,
    ClientSecretCreateResult,
    RootClientCreateParams,
    RootClientCreateReqBody,
    RotateClientSecretParams,
    RotateClientSecretReqBody,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
)

v1 = APIRouter(prefix="/v1")


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

    logger.info(f"fetched workspace {workspace.id}")

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
            scopes=api_params.scopes,
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
            rate_limit_bucket_size=client_params.rate_limit_bucket_size,
            rate_limit_refill_amount=client_params.rate_limit_refill_amount,
            rate_limit_refill_interval=client_params.rate_limit_refill_interval,
        )
    )

    logger.info(f"created basic client {basic_client.id}")

    return basic_client


@v1.get("/clients.getClient", response_model=Client)
def get_basic_client(
    db: Annotated[Db, Depends(get_db)],
    jwt: Annotated[JwtPayload, Depends(root_authorizer)],
    client_id: Annotated[str, Query()],
):
    root_client = db.get_client(jwt.sub)

    if root_client is None:
        logger.error(f"Somehow jwt sub ${jwt.sub} is not a client that exists")
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

    basic_client = db.get_client(client_id)

    if basic_client is None:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Client not found")

    if basic_client.workspace_id != root_client.for_workspace_id:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Client not found")

    return basic_client


@v1.post("/clients.rotateSecret", response_model=ClientSecretCreateResult)
def rotate_secret(
    params: Annotated[RotateClientSecretReqBody, Body()],
    db: Annotated[Db, Depends(get_db)],
    publisher: Annotated[Publisher, Depends(get_publisher)],
    jwt: Annotated[JwtPayload, Depends(root_authorizer)],
    background_tasks: BackgroundTasks,
):
    secrets = db.get_client_secrets_by_client_id(params.client_id)

    # validation of number of secrets that should exist
    if len(secrets) == 2:
        raise HTTPException(
            HTTP_400_BAD_REQUEST,
            detail="This client already has 2 secrets. First delete a secret before ",
        )

    if len(secrets) == 0:
        logger.error(
            "Client {params.id} has no secrets to rotate. This should never happen."
        )
        raise HTTPException(
            HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again later.",
        )

    old_secret = secrets[0]

    root_client = db.get_client(jwt.sub)

    # validation of root client
    if root_client is None:
        logger.error(f"Somehow jwt sub ${jwt.sub} is not a client that exists")
        raise HTTPException(
            HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again later.",
        )

    secret_client = db.get_client(old_secret.client_id)

    # validation of secret client
    if secret_client is None:
        logger.error(f"Somehow secret client {old_secret.client_id} does not exist")
        raise HTTPException(
            HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again later.",
        )

    # validation that the root client has access to the secret client
    if secret_client.workspace_id != root_client.for_workspace_id:
        raise HTTPException(
            HTTP_403_FORBIDDEN,
            detail="You do not have permission to rotate this client's secret",
        )

    # rotate secret and create new secret
    secret = db.rotate_client_secret(
        RotateClientSecretParams(
            client_id=params.client_id,
            expires_at=params.expires_at,
        )
    )

    background_tasks.add_task(publisher.send_secret_rotated, secret_client)

    return secret


@v1.post("/tokens.verifyToken", response_model=BasicAuthorizerResult)
def verify_token(
    authorize_result: Annotated[BasicAuthorizerResult, Depends(basic_authorizer)],
):
    return authorize_result
