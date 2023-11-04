import base64
import datetime
import hashlib
from enum import Enum
from typing import Annotated, List

import jwt
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel

from .authorizer import secret
from .db import Base, Db, engine, get_db
from .schemas import JwtPayload
from .v1_router import v1

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(v1)


class GrantTypeEnum(str, Enum):
    client_credentials = "client_credentials"


class OAuthTokenParams(BaseModel):
    client_id: str | None
    client_secret: str | None
    grant_type: GrantTypeEnum


class BasicAuthHeader(BaseModel):
    client_id: str
    client_secret: str


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
        client_id=base64_decoded_split[0], client_secret=base64_decoded_split[1]
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    scope: str | None


@app.post("/oauth/token", response_model=TokenResponse)
async def oauth_token(request: Request, db: Annotated[Db, Depends(get_db)]):
    """
    Generate an access token for a client. This supports the client credentials flow
    with the client_id, client_secret, and grant_type parameters being sent in a combination of
    the request body, authorization header, and form data.
    """
    content_type = request.headers.get("Content-Type")

    client_ids: List[str | None] = []
    client_secrets: List[str | None] = []
    grant_types: List[str | None] = []

    if content_type == "application/x-www-form-urlencoded":
        form = await request.form()

        form_parsed = OAuthTokenParams(
            client_id=form.get("client_id"),
            client_secret=form.get("client_secret"),
            grant_type=form.get("grant_type"),
        )

        client_ids.append(form_parsed.client_id)
        client_secrets.append(form_parsed.client_secret)
        grant_types.append(form_parsed.grant_type)

    elif content_type == "application/json":
        body = await request.json()

        body_parsed = OAuthTokenParams(
            client_id=body.get("client_id"),
            client_secret=body.get("client_secret"),
            grant_type=body.get("grant_type"),
        )

        client_ids.append(body_parsed.client_id)
        client_secrets.append(body_parsed.client_secret)
        grant_types.append(body_parsed.grant_type)

    auth_header = request.headers.get("Authorization")

    if auth_header is not None:
        basic_auth_header = parse_basic_auth_header(auth_header)

        if basic_auth_header is not None:
            client_ids.append(basic_auth_header.client_id)
            client_secrets.append(basic_auth_header.client_secret)

    client_id_parsed = next((v for v in client_ids if v is not None), None)
    client_secret_parsed = next((v for v in client_secrets if v is not None), None)
    grant_type_parsed = next((v for v in grant_types if v is not None), None)

    if (
        client_id_parsed is None
        or client_secret_parsed is None
        or grant_type_parsed is None
    ):
        raise HTTPException(status_code=400, detail="Invalid request")

    client = db.get_client(client_id_parsed)

    if client is None:
        raise HTTPException(status_code=400, detail="Invalid client")

    client_secret = db.get_client_secret(client_id_parsed)

    if client_secret is None:
        raise HTTPException(status_code=400, detail="Invalid client")

    hash = hashlib.sha256()
    hash.update(client_secret_parsed.encode())
    hashed_secret = hash.hexdigest()

    if client_secret != hashed_secret:
        return HTTPException(status_code=400, detail="Invalid client")

    now = datetime.datetime.now()

    payload = JwtPayload(sub=client.id, iat=now, exp=now + datetime.timedelta(days=1))

    token = jwt.encode(
        payload.model_dump(),
        secret,
        algorithm="HS256",
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=datetime.timedelta(days=1).total_seconds(),
        scope=None,
    )
