import {
  getWorkspaceByTenantId,
  getWorkspaceMembers,
} from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { MemberItem } from "./member-item";
import { Button } from "@/components/ui/button";

export default async function TeamPage() {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const members = await getWorkspaceMembers(workspace.id);

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">Team</h2>
        <Button>Place Holder Invite Member Button</Button>
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
