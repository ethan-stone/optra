from typing import Annotated

from fastapi import APIRouter, Body, Depends, Header
from pydantic import BaseModel

from .authorizer import oauth2_scheme
from .db import Db, get_db
from .schemas import ClientCreateParams, ClientCreateResult

v1 = APIRouter(prefix="/v1")


class ClientParams(BaseModel):
    name: str


@v1.post("/internal.createRootClient", response_model=ClientCreateResult)
def create_root_client(
    authorization: Annotated[str, Header()],
    client_params: Annotated[ClientCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_scheme)],
):
    client = db.create_client(client_params)

    return client
