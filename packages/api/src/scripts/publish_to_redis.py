import redis


def main():
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

    redis_client.publish("secret.rotated", "hello world")

    print("published message to redis channel secret.rotated")

    redis_client.close()


if __name__ == "__main__":
    main()
