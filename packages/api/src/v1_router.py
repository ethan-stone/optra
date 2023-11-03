from typing import Annotated

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from .db import Db, get_db
from .schemas import ClientCreateParams, ClientCreateResult

v1 = APIRouter(prefix="/v1")


class ClientParams(BaseModel):
    name: str


@v1.post("/internal.createRootClient", response_model=ClientCreateResult)
def create_root_client(
    client_params: Annotated[ClientCreateParams, Body()],
    db: Annotated[Db, Depends(get_db)],
):
    client = db.create_client(client_params)

    return client
