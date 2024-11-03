import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleUserRepo } from "@optra/core/users";
import { env } from "@/env";

async function getUserRepo() {
  const { db } = await getDrizzle(env.DATABASE_URL);
  return new DrizzleUserRepo(db);
}

export async function setActiveWorkspaceId(
  userId: string,
  workspaceId: string,
) {
  const userRepo = await getUserRepo();
  await userRepo.setActiveWorkspaceId(userId, workspaceId);
}
