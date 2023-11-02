from datetime import timedelta

import pytest

from ..token_bucket import TokenBucket


@pytest.fixture
def token_bucket():
    return TokenBucket(100, 10, 1000, 100)


def test_token_bucket_init(token_bucket):
    assert token_bucket.size == 100
    assert token_bucket.refill_amount == 10
    assert token_bucket.refill_interval == 1000
    assert token_bucket.tokens == 100


def test_token_bucket_get_tokens(token_bucket):
    assert token_bucket.get_tokens(10) is True
    assert token_bucket.tokens == 90

    assert token_bucket.get_tokens(100) is False
    assert token_bucket.tokens == 90


def test_token_bucket_refill(token_bucket):
    token_bucket.get_tokens(100)  # empty bucket
    assert token_bucket.tokens == 0

    token_bucket.last_refill_time -= timedelta(seconds=1)
    token_bucket.calculate_new_tokens()

    assert token_bucket.tokens == 10  # refilled 10 tokens


def test_token_bucket_overfill(token_bucket):
    token_bucket.tokens = 100
    token_bucket.last_refill_time -= timedelta(seconds=10)

    token_bucket.calculate_new_tokens()
    assert token_bucket.tokens == 100  # capped at max size
