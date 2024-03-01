import { schema } from "@optra/db";
import { db } from "../db";
import { uid } from "@/utils/uid";

export async function getApiByWorkspaceIdAndApiId(
  workspaceId: string,
  apiId: string,
) {
  return db.query.apis.findFirst({
    where: (table, { eq, and }) =>
      and(eq(table.id, apiId), eq(table.workspaceId, workspaceId)),
  });
}

type AddScopeToApiArgs = {
  apiId: string;
  name: string;
  description: string;
};

export async function addScopeToApi(args: AddScopeToApiArgs) {
  const id = uid("api_scope");

  const now = new Date();

  await db.insert(schema.apiScopes).values({
    id: id,
    apiId: args.apiId,
    name: args.name,
    description: args.description,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: id,
  };
}
