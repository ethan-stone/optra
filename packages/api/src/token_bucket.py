from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class TokenBucket:
    size: int
    refill_amount: int
    refill_interval: int
    tokens: int
    last_refill_time: datetime = datetime.now(timezone.utc)

    def __post_init__(self):
        if self.tokens is None:
            self.tokens = self.size

    def get_tokens(self, num_tokens: int) -> bool:
        if self.can_consume(num_tokens):
            self.tokens -= num_tokens
            return True
        return False

    def can_consume(self, num_tokens: int) -> bool:
        if self.tokens + self.calculate_new_tokens() >= num_tokens:
            return True
        return False

    def calculate_new_tokens(self) -> int:
        now = datetime.now(timezone.utc)
        time_passed = now - self.last_refill_time
        new_tokens = (
            (time_passed.total_seconds() * 1000)
            // self.refill_interval
            * self.refill_amount
        )

        if self.tokens + new_tokens > self.size:
            new_tokens = self.size - self.tokens
        self.tokens = min(self.size, self.tokens + new_tokens)
        self.last_refill_time = now
        return new_tokens


Buckets = dict[str, TokenBucket]

buckets: Buckets = {}


def get_token_buckets() -> Buckets:
    return buckets
