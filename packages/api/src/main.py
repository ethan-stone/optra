from enum import Enum
from fastapi import FastAPI, Body
from pydantic import BaseModel
from .v1_router import v1
from typing import Annotated
import jwt
import datetime
from . import db

db.Base.metadata.create_all(bind=db.engine)

app = FastAPI()

app.include_router(v1)


class GrantTypeEnum(str, Enum):
    client_credentials = "client_credentials"


class OAuthTokenParams(BaseModel):
    client_id: str
    client_secret: str
    grant_type: GrantTypeEnum


secret = "iv20vbspbbe9bxjcaosivbfjxb9834"


@app.post("/oauth/token")
def oauth_token(body: Annotated[OAuthTokenParams, Body()]):
    now = datetime.datetime.now()

    payload = {
        "sub": body.client_id,
        "iat": now,
        "exp": now + datetime.timedelta(days=1),
    }

    token = jwt.encode(
        payload,
        secret,
        algorithm="HS256",
    )

    return {"access_token": token, "token_type": "bearer"}
