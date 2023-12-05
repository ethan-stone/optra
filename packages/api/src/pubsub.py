import json
from datetime import datetime, timezone
from typing import Annotated, Protocol

import redis.asyncio as redis
from fastapi import Depends

from .environment import Env, get_env
from .schemas import Client, SecretRotatedEvent, SecretRotatedEventData
from .uid import uid


class Publisher(Protocol):
    async def send_secret_rotated(self, client: Client) -> None:
        ...


class RedisPublisher:
    r: redis.Redis

    def __init__(self, r: redis.Redis):
        self.r = r

    async def send_secret_rotated(self, client: Client) -> None:
        secret_rotated_event = SecretRotatedEvent(
            event_type="client.secret.rotated",
            id=uid("evt"),
            data=SecretRotatedEventData(
                **{
                    **client.model_dump(),
                    "created_at": datetime.fromtimestamp(
                        client.created_at.timestamp(), timezone.utc
                    ).timestamp(),
                }
            ),
            timestamp=datetime.now(tz=timezone.utc).timestamp(),
        )

        await self.r.publish("clients", json.dumps(secret_rotated_event.model_dump()))


def get_publisher(env: Annotated[Env, Depends(get_env)]) -> Publisher:
    r = redis.from_url(env.redis_url, decode_responses=True)
    return RedisPublisher(r)
