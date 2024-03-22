import { schema } from "@optra/db";
import { db } from "../db";
import { uid } from "@/utils/uid";
import { eq } from "drizzle-orm";

export async function getApiByWorkspaceIdAndApiId(
  workspaceId: string,
  apiId: string,
) {
  return db.query.apis.findFirst({
    where: (table, { eq, and }) =>
      and(eq(table.id, apiId), eq(table.workspaceId, workspaceId)),
  });
}

type UpdateApiByIdArgs = {
  tokenExpirationInSeconds: number;
  name: string;
};

export async function updateApiById(id: string, args: UpdateApiByIdArgs) {
  await db
    .update(schema.apis)
    .set({
      tokenExpirationInSeconds: args.tokenExpirationInSeconds,
      name: args.name,
    })
    .where(eq(schema.apis.id, id));
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

export async function getApiScopeById(id: string) {
  return db.query.apiScopes.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

export async function deleteApiScopeById(id: string) {
  await db.transaction(async (tx) => {
    await tx.delete(schema.apiScopes).where(eq(schema.apiScopes.id, id));
    await tx
      .delete(schema.clientScopes)
      .where(eq(schema.clientScopes.apiScopeId, id));
  });
}
