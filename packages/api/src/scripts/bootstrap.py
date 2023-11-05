from ..db import Db, get_db
from ..schemas import ClientCreateParams, ClientCreateResult


def bootstrap(db: Db) -> ClientCreateResult:
    result = db.create_client(ClientCreateParams(name="Internal Client"))

    return result


if __name__ == "__main__":
    db = next(get_db())

    result = bootstrap(db)

    print(result.model_dump())
