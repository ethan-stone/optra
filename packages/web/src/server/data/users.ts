import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleUserRepo, type CreateUserParams } from "@optra/core/users";
import { env } from "@/env";

async function getUserRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleUserRepo(db);
}

export async function setActiveWorkspaceId(
  userId: string,
  workspaceId: string | null,
) {
  const userRepo = await getUserRepo();
  await userRepo.setActiveWorkspaceId(userId, workspaceId);
}

export async function createUser(user: CreateUserParams) {
  const userRepo = await getUserRepo();
  await userRepo.create(user);
}
