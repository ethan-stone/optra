from typing import Annotated

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from .authorizer import (
    TokenAuthorizer,
    get_internal_authorizer,
    oauth2_client_credentials_scheme,
)
from .db import Db, get_db
from .schemas import ClientCreateParams, ClientCreateResult

v1 = APIRouter(prefix="/v1")


class ClientParams(BaseModel):
    name: str


@v1.post("/internal.createRootClient", response_model=ClientCreateResult)
def create_root_client(
    client_params: Annotated[ClientCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_client_credentials_scheme)],
    authorizer: Annotated[TokenAuthorizer, Depends(get_internal_authorizer)],
):
    token_payload = authorizer.authorize(token)

    print(token_payload)

    client = db.create_client(client_params)

    return client
