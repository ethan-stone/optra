import asyncio
import base64
import datetime
import hashlib
import json
import sys
import time
from contextlib import asynccontextmanager
from enum import Enum
from logging import NOTSET, Handler, LogRecord
from typing import Annotated, List

import httpx
import jwt
import redis.asyncio as redis
from fastapi import Depends, FastAPI, HTTPException, Request
from loguru import logger
from pydantic import BaseModel, ValidationError
from redis.asyncio.client import PubSub as AsyncPubSub

from .db import Base, Db, engine, get_db
from .environment import Env, env, get_env
from .schemas import JwtPayload, SecretEvent
from .uid import uid
from .v1_router import v1


# TODO handle request id missing because it may not be present for async tasks
# such has redis channel subscriber
def formatter(record):
    subset = {
        "timestamp": int(record["time"].timestamp() * 1000),
        "message": record["level"].name
        + " "
        + record["extra"]["request_id"]
        + " "
        + record["message"],
        "level": record["level"].name,
        "function": record["function"],
        "name": record["name"],
        "app": "api",
        "request": {
            "id": record["extra"]["request_id"],
            "path": record["extra"]["path"],
            "method": record["extra"]["method"],
            "status_code": record["extra"].get("status_code", None),
            "duration": record["extra"].get("duration", None),
        },
    }

    record["extra"]["serialized"] = (
        json.dumps(subset) if not env.debug else json.dumps(subset, indent=4)
    )

    return "{extra[serialized]}\n"


# todo use ayncio task to send logs periodically and non blocking
class LogFlareHandler(Handler):
    api_key: str
    source: str
    interval: int
    last_run: float
    buffer: list
    flush_logs_task: asyncio.Task

    def __init__(
        self, api_key: str, source: str, level: int = NOTSET, interval: int = 1
    ):
        Handler.__init__(self, level)

        self.api_key = api_key
        self.source = source
        self.interval = interval
        self.last_run = time.monotonic()
        self.buffer = []
        self.flush_logs_task = asyncio.create_task(self.run_flush_task())

    def emit(self, record: LogRecord):
        message = record.getMessage()

        msg_dict = json.loads(message)

        msg = msg_dict.pop("message")

        self.buffer.append({"message": msg, "metadata": msg_dict})

    def flush(self):
        httpx.post(
            f"https://api.logflare.app/api/logs?source={self.source}",
            json={"batch": self.buffer},
            headers={
                "X-API-KEY": self.api_key,
            },
        )

        self.buffer = []

    async def run_flush_task(self):
        while True:
            await asyncio.sleep(3)

            if len(self.buffer) > 0 and (
                len(self.buffer) >= 100
                or time.monotonic() - self.last_run > self.interval
            ):
                await asyncio.to_thread(self.flush)


logflare_handler: LogFlareHandler | None = None

if not env.debug:
    logflare_handler = LogFlareHandler(
        env.logflare_api_key, env.logflare_source_id, NOTSET, 1
    )

    logger.remove(0)
    logger.add(
        logflare_handler,
        format=formatter,
    )

else:
    logger.remove(0)
    logger.add(
        sys.stdout,
        format=formatter,
    )


Base.metadata.create_all(bind=engine)


async def handle_secret_rotated(channel: AsyncPubSub):
    while True:
        message = await channel.get_message(ignore_subscribe_messages=True)
        if message is not None:
            try:
                json_message = json.loads(message["data"])

                msg = SecretEvent(event=json_message)

                print(msg)

            except ValidationError:
                logger.error("Received invalid secret.rotated event format")


redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("secret.rotated")

    reader_task = asyncio.create_task(handle_secret_rotated(pubsub))

    yield

    if logflare_handler is not None:
        logflare_handler.flush()

        try:
            logflare_handler.flush_logs_task.cancel()
        except asyncio.exceptions.CancelledError:
            pass

        try:
            reader_task.cancel()
        except asyncio.exceptions.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)


@app.middleware("http")
async def logger_middleware(request: Request, call_next):
    request_id = uid(prefix="req", random_length=6)

    with logger.contextualize(
        request_id=request_id,
        path=request.url.path,
        method=request.method,
    ):
        start_timestamp = int(datetime.datetime.now().timestamp() * 1000)

        logger.info(f"begin request {request_id}")

        response = await call_next(request)

        end_timestamp = int(datetime.datetime.now().timestamp() * 1000)

        logger.bind(
            status_code=response.status_code,
            duration=end_timestamp - start_timestamp,
        ).info(f"end request {request_id}")

        return response


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
async def oauth_token(
    request: Request,
    db: Annotated[Db, Depends(get_db)],
    env: Annotated[Env, Depends(get_env)],
):
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

    logger.info("validated request params")

    client = db.get_client(client_id_parsed)

    if client is None:
        raise HTTPException(status_code=400, detail="Invalid client")

    logger.info(f"fetched client {client.id}")

    client_secret = db.get_client_secret_value(client_id_parsed)

    if client_secret is None:
        raise HTTPException(status_code=400, detail="Invalid client")

    hash = hashlib.sha256()
    hash.update(client_secret_parsed.encode())
    hashed_secret = hash.hexdigest()

    if client_secret != hashed_secret:
        raise HTTPException(status_code=400, detail="Invalid client")

    now = datetime.datetime.now()

    payload = JwtPayload(
        sub=client.id,
        iat=now,
        exp=now + datetime.timedelta(days=1),
        version=client.version,
    )

    token = jwt.encode(
        payload.model_dump(),
        env.jwt_secret,
        algorithm="HS256",
    )

    logger.info("generated token")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=datetime.timedelta(days=1).total_seconds(),
        scope=None,
    )
