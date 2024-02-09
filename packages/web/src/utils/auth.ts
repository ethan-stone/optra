import { auth } from "@clerk/nextjs";
import { notFound } from "next/navigation";

export function getTenantId() {
  const { userId, orgId } = auth();

  return orgId ?? userId ?? notFound();
}
