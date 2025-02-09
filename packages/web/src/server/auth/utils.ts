import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

export type User = {
  id: string;
  email: string;
  activeWorkspaceId: string | null;
  role: "admin" | "developer" | "viewer";
};

export async function getTenantId() {
  const { userId, orgId } = await auth();

  return orgId ?? userId ?? notFound();
}

export async function getUser(): Promise<User | null> {
  const user = await currentUser();

  const { orgId } = await auth();

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
    role: user.publicMetadata.role as "admin" | "developer" | "viewer",
  };
}
