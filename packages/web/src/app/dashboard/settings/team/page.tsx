import {
  getWorkspaceByTenantId,
  getWorkspaceMembers,
} from "@/server/data/workspaces";
import { getTenantId } from "@/server/auth/utils";
import { notFound } from "next/navigation";
import { MemberItem } from "./member-item";
import { getUser } from "@/server/auth/utils";
import { InviteMemberButton } from "./invite-member-button";

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
        {user.role === "admin" && <InviteMemberButton />}
      </div>
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md">
          <div className="flex flex-col items-center justify-between gap-4 p-4">
            <h1 className="text-2xl font-semibold">No members found</h1>
            <p className="text text-stone-500">
              Looks like there are no members for this workspace. Invite a
              member to get started.
            </p>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
