import {
  getWorkspaceByTenantId,
  getWorkspaceMembers,
} from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { notFound } from "next/navigation";
import { MemberItem } from "./member-item";
import { Button } from "@/components/ui/button";
import { getUser } from "@/server/auth/utils";

export default async function TeamPage() {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const members = await getWorkspaceMembers(workspace.id);

  const user = await getUser();

  if (!user) {
    return notFound();
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">Team</h2>
        {user.role === "admin" && (
          <Button>Place Holder Invite Member Button</Button>
        )}
      </div>
      <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
        {members.map((member) => (
          <MemberItem
            key={member.id}
            user={{
              id: member.id,
              email: member.user.email,
            }}
          />
        ))}
      </div>
    </div>
  );
}
