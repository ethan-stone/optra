import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

export type User = {
  id: string;
  email: string;
  activeWorkspaceId: string | null;
  role: "org:admin" | "org:developer" | "org:member" | null;
};

export async function getTenantId() {
  const { userId, orgId } = await auth();

  return orgId ?? userId ?? notFound();
}

export async function getUser(): Promise<User | null> {
  const user = await currentUser();

  const { orgId, orgRole } = await auth();

  if (!user) {
    return null;
  }

  if (!user.primaryEmailAddress?.emailAddress) {
    return notFound();
  }

  return {
    id: user.id,
    email: user.primaryEmailAddress.emailAddress,
    activeWorkspaceId: orgId ?? null,
    role: orgRole as "org:admin" | "org:developer" | "org:member" | null,
  };
}
