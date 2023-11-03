import base64
import datetime
from enum import Enum
from typing import Annotated, List

import jwt
from fastapi import Body, FastAPI, Form, Header, HTTPException
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
    client_id: str | None
    client_secret: str | None
    grant_type: GrantTypeEnum | None


class BasicAuthHeader(BaseModel):
    client_id: str
    cliet_secret: str


def parse_basic_auth_header(header: str) -> BasicAuthHeader | None:
    """
    Parse a basic auth header. If it is not a basic auth header, return None.
    """
    header_split = header.split(" ")

    if len(header_split) != 2:
        return None

    base64_encoded = header_split[1]

    base64_decoded = base64.b64decode(base64_encoded).decode("utf-8")

    base64_decoded_split = base64_decoded.split(":")

    if len(base64_decoded_split) != 2:
        return None

    return BasicAuthHeader(
        client_id=base64_decoded_split[0], cliet_secret=base64_decoded_split[1]
    )


@app.post("/oauth/token")
def oauth_token(
    client_id: Annotated[str, Form()] = None,
    client_secret: Annotated[str, Form()] = None,
    grant_type: Annotated[str, Form()] = None,
    body: Annotated[OAuthTokenParams, Body()] = None,
    authorization: Annotated[str, Header()] = None,
):
    client_ids: List[str | None] = list()
    client_secrets: List[str | None] = list()
    grant_types: List[str | None] = list()

    client_ids.append(client_id)
    client_secrets.append(client_secret)
    grant_types.append(grant_type)

    if authorization is not None:
        basic_auth_header = parse_basic_auth_header(authorization)

        if basic_auth_header is not None:
            client_ids.append(basic_auth_header.client_id)
            client_secrets.append(basic_auth_header.cliet_secret)

    if body is not None:
        client_ids.append(body.client_id)
        client_secrets.append(body.client_secret)
        grant_types.append(body.grant_type)

    client_id_parsed = next((v for v in client_ids if v is not None), None)
    client_secret_parsed = next((v for v in client_secrets if v is not None), None)
    grant_type_parsed = next((v for v in grant_types if v is not None), None)

    if (
        client_id_parsed is None
        or client_secret_parsed is None
        or grant_type_parsed is None
    ):
        raise HTTPException(status_code=400, detail="Invalid request")

    now = datetime.datetime.now()

    payload = JwtPayload(
        sub=client_id_parsed, iat=now, exp=now + datetime.timedelta(days=1)
    )

    token = jwt.encode(
        payload.model_dump(),
        secret,
        algorithm="HS256",
    )

    return {"access_token": token, "token_type": "bearer"}
