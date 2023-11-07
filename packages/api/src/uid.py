from ulid import ULID


def uid(prefix: str, random_length: int = 16):
    """
    Generates an ULID with the given prefix.

    First 10 characters are the timestamp

    Last 16 characters are random
    """
    new_ulid = str(ULID()).lower()

    if random_length < 6:
        raise ValueError("random_length must be at least 6")

    if random_length > 16:
        raise ValueError("random_length must be at most 16")

    new_ulid = new_ulid[:10] + new_ulid[-random_length:]

    return f"{prefix}_{new_ulid}"
