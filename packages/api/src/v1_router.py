from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from typing import Annotated
from .db import Db, get_db
from .schemas import ClientCreate, Client

v1 = APIRouter(prefix="/v1")


class ClientParams(BaseModel):
    name: str


@v1.post("/internal.createRootClient", response_model=Client)
def create_root_client(
    client_params: Annotated[ClientCreate, Body()], db: Annotated[Db, Depends(get_db)]
):
    client = db.create_client(client_params)

    return client
