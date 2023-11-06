from ..db import Base, Db, engine, get_db
from ..schemas import (
    ClientCreateParams,
    ClientCreateResult,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
)


def bootstrap(db: Db) -> tuple[WorkspaceCreateResult, ClientCreateResult]:
    Base.metadata.create_all(bind=engine)

    internal_workspace = db.create_workspace(
        WorkspaceCreateParams(name="Internal Workspace")
    )

    internal_client = db.create_client(
        ClientCreateParams(name="Internal Client", workspace_id=internal_workspace.id)
    )

    return internal_workspace, internal_client


if __name__ == "__main__":
    db = next(get_db())

    internal_workspace, internal_client = bootstrap(db)

    print(internal_workspace.model_dump())
    print(internal_client.model_dump())
