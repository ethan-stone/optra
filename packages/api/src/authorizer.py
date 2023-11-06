from dataclasses import dataclass
from typing import Annotated, Dict, Optional, Protocol

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from starlette.status import HTTP_401_UNAUTHORIZED

from .db import Db, get_db
from .environment import Env, get_env
from .schemas import JwtPayload


class TokenAuthorizer(Protocol):
    def authorize(self, token: str) -> JwtPayload:
        ...


class TokenAuthorizeError(Exception):
    pass


@dataclass
class InternalTokenAuthorizer:
    secret: str
    internal_client_id: str

    def authorize(self, token: str) -> JwtPayload:
        try:
            payload_dict = jwt.decode(token, self.secret, algorithms=["HS256"])

            payload = JwtPayload(**payload_dict)

            if payload.sub != self.internal_client_id:
                raise TokenAuthorizeError("Invalid client")

            return payload

        except jwt.exceptions.PyJWKError as pyjwt_error:
            raise TokenAuthorizeError("Failed to authorize token") from pyjwt_error


class RootTokenAuthorizer:
    def authorizer(self, token: str) -> bool:
        return token == "root_token"


class BasicTokenAuthorizer:
    def authorizer(self, token: str) -> bool:
        return token == "basic_token"


class OAuth2ClientCredentialsBearer(OAuth2):
    def __init__(
        self,
        tokenUrl: str,
        scheme_name: Optional[str] = None,
        scopes: Optional[Dict[str, str]] = None,
        description: Optional[str] = None,
        auto_error: bool = True,
    ):
        if not scopes:
            scopes = {}
        flows = OAuthFlowsModel(
            clientCredentials={
                "tokenUrl": tokenUrl,
            }
        )
        super().__init__(
            flows=flows,
            scheme_name=scheme_name,
            description=description,
            auto_error=auto_error,
        )

    async def __call__(self, request: Request) -> Optional[str]:
        authorization: str = request.headers.get("Authorization")
        scheme, param = get_authorization_scheme_param(authorization)
        if not authorization or scheme.lower() != "bearer":
            if self.auto_error:
                raise HTTPException(
                    status_code=HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                return None  # pragma: nocover
        return param


oauth2_client_credentials_scheme = OAuth2ClientCredentialsBearer(tokenUrl="oauth/token")


def internal_authorizer(
    token: Annotated[str, Depends(oauth2_client_credentials_scheme)],
    env: Annotated[Env, Depends(get_env)],
) -> JwtPayload:
    try:
        authorizer = InternalTokenAuthorizer(
            secret=env.jwt_secret, internal_client_id=env.internal_client_id
        )

        payload = authorizer.authorize(token)

        return payload

    except TokenAuthorizeError as token_authorize_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Failed to authorize token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from token_authorize_error


def root_authorizer(
    token: Annotated[str, Depends(oauth2_client_credentials_scheme)],
    env: Annotated[Env, Depends(get_env)],
    db: Annotated[Db, Depends(get_db)],
):
    try:
        payload_dict = jwt.decode(token, env.jwt_secret, algorithms=["HS256"])

        payload = JwtPayload(**payload_dict)

        client = db.get_client(payload.sub)

        if not client:
            raise TokenAuthorizeError("Invalid client")

        if client.for_workspace_id is None:
            raise TokenAuthorizeError("Invalid client")

        return payload

    except TokenAuthorizeError as token_authorize_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Failed to authorize token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from token_authorize_error
