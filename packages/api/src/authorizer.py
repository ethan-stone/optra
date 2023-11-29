from datetime import datetime
from typing import Annotated, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from loguru import logger
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN

from .db import ClientsCache, Db, get_clients_cache, get_db
from .environment import Env, get_env
from .schemas import BasicAuthorizerResult, InvalidReasons, JwtPayload
from .token_bucket import Buckets, TokenBucket, get_token_buckets


class TokenAuthorizeError(Exception):
    reason: InvalidReasons

    def __init__(self, reason: InvalidReasons):
        self.reason = reason


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
    db: Annotated[Db, Depends(get_db)],
) -> JwtPayload:
    try:
        payload_dict = jwt.decode(token, env.jwt_secret, algorithms=["HS256"])

        payload = JwtPayload(**payload_dict)

        if payload.sub != env.internal_client_id:
            logger.info("jwt sub does not match internal client id")
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN,
                detail="Forbidden",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info("jwt sub matches internal client id")

        # root authorizer requests is not a critical path for performance
        # so to simplify things we just fetch the client from the db every time
        client = db.get_client(payload.sub)

        if payload.version != client.version:
            logger.info("jwt version does not match client version")
            raise TokenAuthorizeError(InvalidReasons.VERSION_MISMATCH)

        if (
            payload.secret_expires_at is not None
            and payload.secret_expires_at < datetime.utcnow()
        ):
            logger.info("the secret used to created this jwt has expired")
            raise TokenAuthorizeError(InvalidReasons.SECRET_EXPIRED)

        return payload

    except jwt.exceptions.ExpiredSignatureError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=InvalidReasons.EXPIRED,
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except jwt.exceptions.InvalidSignatureError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=InvalidReasons.INVALID_SIGNATURE,
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except jwt.exceptions.PyJWTError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=InvalidReasons.BAD_JWT,
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except TokenAuthorizeError as token_authorize_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=token_authorize_error.reason,
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
                status_code=HTTP_403_FORBIDDEN,
                detail="Forbidden",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if client.for_workspace_id is None:
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN,
                detail="Forbidden",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info("jwt sub matches internal client id")

        # root authorizer requests is not a critical path for performance
        # so to simplify things we just fetch the client from the db every time
        client = db.get_client(payload.sub)

        if payload.version != client.version:
            logger.info("jwt version does not match client version")
            raise TokenAuthorizeError(InvalidReasons.VERSION_MISMATCH)

        if (
            payload.secret_expires_at is not None
            and payload.secret_expires_at < datetime.utcnow()
        ):
            logger.info("the secret used to created this jwt has expired")
            raise TokenAuthorizeError(InvalidReasons.SECRET_EXPIRED)

        return payload

    except jwt.exceptions.ExpiredSignatureError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=InvalidReasons.EXPIRED,
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except jwt.exceptions.InvalidSignatureError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=InvalidReasons.INVALID_SIGNATURE,
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except jwt.exceptions.PyJWTError as pyjwt_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=InvalidReasons.BAD_JWT,
            headers={"WWW-Authenticate": "Bearer"},
        ) from pyjwt_error

    except TokenAuthorizeError as token_authorize_error:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail=token_authorize_error.reason,
            headers={"WWW-Authenticate": "Bearer"},
        ) from token_authorize_error


def basic_authorizer(
    token: Annotated[str, Depends(oauth2_client_credentials_scheme)],
    env: Annotated[Env, Depends(get_env)],
    db: Annotated[Db, Depends(get_db)],
    clients_cache: Annotated[ClientsCache, Depends(get_clients_cache)],
    token_buckets: Annotated[Buckets, Depends(get_token_buckets)],
):
    try:
        payload_dict = jwt.decode(token, env.jwt_secret, algorithms=["HS256"])

        payload = JwtPayload(**payload_dict)

        client = clients_cache.get(payload.sub)

        if client is None:
            client = db.get_client(payload.sub)

            if client is None:
                return BasicAuthorizerResult(
                    valid=False, reason=InvalidReasons.NOT_FOUND
                )

            clients_cache.update({client.id: client})

        if payload.version != client.version:
            logger.info("jwt version does not match client version")
            return BasicAuthorizerResult(
                valid=False, reason=InvalidReasons.VERSION_MISMATCH
            )

        if (
            payload.secret_expires_at is not None
            and payload.secret_expires_at < datetime.utcnow()
        ):
            logger.info("the secret used to created this jwt has expired")
            return BasicAuthorizerResult(
                valid=False, reason=InvalidReasons.SECRET_EXPIRED
            )

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
