import json
from datetime import datetime, timezone

import redis

from ..schemas import SecretEvent


def main():
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

    event = SecretEvent(
        event={
            "event_type": "secret.rotated",
            "data": {"id": "123"},
            "id": "123",
            "timestamp": datetime.now(timezone.utc).timestamp(),
        }
    )

    redis_client.publish("secret.rotated", json.dumps(event.event.model_dump()))

    print("published message to redis channel secret.rotated")

    redis_client.close()


if __name__ == "__main__":
    main()
