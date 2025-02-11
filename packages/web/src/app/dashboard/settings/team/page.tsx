import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { notFound } from "next/navigation";
import { MemberList } from "./member-list";
import { getUser } from "@/server/auth/utils";
import { InviteMemberButton } from "./invite-member-button";

export default async function TeamPage() {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const user = await getUser();

  if (!user) {
    return notFound();
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">Team</h2>
        {(user.role === "org:admin" || user.role === "org:developer") && (
          <InviteMemberButton />
        )}
      </div>
      <MemberList />
    </div>
  );
}
