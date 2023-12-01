import json

from ..main import app

if __name__ == "__main__":
    schema = app.openapi()

    with open("../docs/api-reference/openapi.json", "w") as f:
        f.write(json.dumps(schema))
