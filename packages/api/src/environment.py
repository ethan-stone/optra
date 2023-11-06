import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Env(BaseModel):
    jwt_secret: str
    internal_client_id: str
    internal_client_secret: str
    internal_api_id: str
    internal_workspace_id: str


env = Env(
    jwt_secret=os.environ.get("JWT_SECRET"),
    internal_client_id=os.environ.get("INTERNAL_CLIENT_ID"),
    internal_client_secret=os.environ.get("INTERNAL_CLIENT_SECRET"),
    internal_api_id=os.environ.get("INTERNAL_API_ID"),
    internal_workspace_id=os.environ.get("INTERNAL_WORKSPACE_ID"),
)


def get_env() -> Env:
    return env
