from ..db import get_db
from ..schemas import ClientCreateParams

db = next(get_db())

result = db.create_client(ClientCreateParams(name="Internal Client"))

print(result.model_dump())
