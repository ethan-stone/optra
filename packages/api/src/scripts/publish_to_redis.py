import json

import redis

from ..schemas import SecretRotatedEvent


def main():
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

    event = SecretRotatedEvent(secret_id="123")

    redis_client.publish("secret.rotated", json.dumps(event))

    print("published message to redis channel secret.rotated")

    redis_client.close()


if __name__ == "__main__":
    main()
