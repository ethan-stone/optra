from ..db import Base, Db, engine, get_db
from ..schemas import (
    ApiCreateParams,
    ApiCreateResult,
    ClientCreateResult,
    RootClientCreateParams,
    WorkspaceCreateParams,
    WorkspaceCreateResult,
)


def bootstrap(
    db: Db
) -> tuple[WorkspaceCreateResult, ApiCreateResult, ClientCreateResult]:
    Base.metadata.create_all(bind=engine)

    internal_workspace = db.create_workspace(
        WorkspaceCreateParams(name="Internal Workspace")
    )

    internal_api = db.create_api(
        ApiCreateParams(
            name="Internal API",
            workspace_id=internal_workspace.id,
        )
    )

    internal_client = db.create_root_client(
        RootClientCreateParams(
            name="Internal Client",
            workspace_id=internal_workspace.id,
            for_workspace_id=internal_workspace.id,
            api_id=internal_api.id,
        )
    )

    return internal_workspace, internal_api, internal_client


if __name__ == "__main__":
    db = next(get_db())

    internal_workspace, internal_api, internal_client = bootstrap(db)

    print(internal_workspace.model_dump())
    print(internal_api.model_dump())
    print(internal_client.model_dump())
