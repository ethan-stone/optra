import { env } from "@/env";
import { getDrizzle } from "@optra/core/drizzle";
import {
  type CreateWorkspaceParams,
  DrizzleWorkspaceRepo,
} from "@optra/core/workspaces";

async function getWorkspaceRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleWorkspaceRepo(db);
}

export async function getWorkspaceByTenantId(tenantId: string) {
  const workspaces = await getWorkspaceRepo();

  return workspaces.getByTenantId(tenantId);
}

export async function getWorkspaceById(workspaceId: string) {
  const workspaces = await getWorkspaceRepo();
  return workspaces.getById(workspaceId);
}

export async function createWorkspace(workspace: CreateWorkspaceParams) {
  const workspaces = await getWorkspaceRepo();
  return workspaces.create(workspace);
}

export async function addMemberToWorkspace(
  workspaceId: string,
  userId: string,
) {
  const workspaces = await getWorkspaceRepo();
  return workspaces.addMember(workspaceId, userId);
}

export async function getAccessibleWorkspaces(userId: string) {
  const workspaces = await getWorkspaceRepo();
  return workspaces.getAccessibleWorkspaces(userId);
}
