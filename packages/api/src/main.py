import datetime
from enum import Enum
from typing import Annotated

import jwt
from fastapi import Body, FastAPI
from pydantic import BaseModel

from . import db
from .authorizer import secret
from .schemas import JwtPayload
from .v1_router import v1

db.Base.metadata.create_all(bind=db.engine)

app = FastAPI()

app.include_router(v1)


class GrantTypeEnum(str, Enum):
    client_credentials = "client_credentials"


class OAuthTokenParams(BaseModel):
    client_id: str
    client_secret: str
    grant_type: GrantTypeEnum


@app.post("/oauth/token")
def oauth_token(body: Annotated[OAuthTokenParams, Body()]):
    now = datetime.datetime.now()

    payload = JwtPayload(
        sub=body.client_id, iat=now, exp=now + datetime.timedelta(days=1)
    )

    token = jwt.encode(
        payload.model_dump(),
        secret,
        algorithm="HS256",
    )

    return {"access_token": token, "token_type": "bearer"}
