from typing import Annotated, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from loguru import logger
from starlette.status import HTTP_401_UNAUTHORIZED

from .db import Db, get_db
from .environment import Env, get_env
from .schemas import BasicAuthorizerResult, InvalidReasons, JwtPayload
from .token_bucket import Buckets, TokenBucket, get_token_buckets


class TokenAuthorizeError(Exception):
    pass


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
        payload_dict = jwt.decode(token, env.jwt_secret, algorithms=["HS256"])

        payload = JwtPayload(**payload_dict)

        if payload.sub != env.internal_client_id:
            raise TokenAuthorizeError("Invalid client")

        return payload

    except jwt.exceptions.PyJWTError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Failed to authorize token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

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
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Failed to authorize token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if client.for_workspace_id is None:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Failed to authorize token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload

    except jwt.exceptions.PyJWTError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Failed to authorize token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except TokenAuthorizeError as token_authorize_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Failed to authorize token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from token_authorize_error


def basic_authorizer(
    token: Annotated[str, Depends(oauth2_client_credentials_scheme)],
    env: Annotated[Env, Depends(get_env)],
    db: Annotated[Db, Depends(get_db)],
    token_buckets: Annotated[Buckets, Depends(get_token_buckets)],
):
    try:
        payload_dict = jwt.decode(token, env.jwt_secret, algorithms=["HS256"])

        payload = JwtPayload(**payload_dict)

        # TODO cache clients in memory
        client = db.get_client(payload.sub)

        if not client:
            return BasicAuthorizerResult(valid=False, reason=InvalidReasons.NOT_FOUND)

        if client.rate_limit_bucket_size is None:
            return BasicAuthorizerResult(valid=True)

        token_bucket = token_buckets.get(client.id)

        if token_bucket is None:
            token_bucket = TokenBucket(
                size=client.rate_limit_bucket_size,
                refill_amount=client.rate_limit_refill_amount,
                refill_interval=client.rate_limit_refill_interval,
                tokens=client.rate_limit_bucket_size,
            )

            token_buckets.update({client.id: token_bucket})

        if not token_bucket.get_tokens(1):
            logger.info(f"rate limit exceeded for client {client.id}")
            return BasicAuthorizerResult(
                valid=False, reason=InvalidReasons.RATE_LIMIT_EXCEEDED
            )

        logger.info(f"token for client {client.id} is valid")
        return BasicAuthorizerResult(valid=True)

    except jwt.exceptions.ExpiredSignatureError:
        return BasicAuthorizerResult(valid=False, reason=InvalidReasons.EXPIRED)

    except jwt.exceptions.InvalidSignatureError:
        return BasicAuthorizerResult(
            valid=False, reason=InvalidReasons.INVALID_SIGNATURE
        )

    except jwt.exceptions.PyJWTError:
        return BasicAuthorizerResult(valid=False, reason=InvalidReasons.BAD_JWT)
