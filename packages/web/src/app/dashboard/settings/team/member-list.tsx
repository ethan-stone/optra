"use client";

import { useUser } from "@/components/hooks/use-user";
import { useOrganization } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/shadcn-utils";
import { useState } from "react";

type Props = {
  user: {
    id: string;
    email: string;
    isCurrentUser: boolean;
    role: "org:admin" | "org:member" | "org:developer";
  };
};

type ViewMode = "members" | "invitations";

function RoleBadge({ role }: { role: Props["user"]["role"] }) {
  const roleConfig = {
    "org:admin": {
      label: "Admin",
      className: "border-stone-400 bg-stone-300",
    },
    "org:member": {
      label: "Member",
      className: "border-stone-400 bg-stone-300",
    },
    "org:developer": {
      label: "Developer",
      className: "border-stone-400 bg-stone-300",
    },
  };

  const config = roleConfig[role];

  return (
    <span
      className={cn("rounded-md border px-1 py-0.5 text-xs", config.className)}
    >
      {config.label}
    </span>
  );
}

function InvitationItem({
  email,
  role,
}: {
  email: string;
  role: Props["user"]["role"];
}) {
  return (
    <div className="m-1 rounded-sm hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-sm">{email}</p>
          <span className="rounded-md border border-stone-400 bg-stone-300 px-1 py-0.5 text-xs">
            Pending
          </span>
        </div>
        <RoleBadge role={role} />
      </div>
    </div>
  );
}

export function MemberItem(props: Props) {
  return (
    <div className="m-1 rounded-sm hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-sm">{props.user.email}</p>
          {props.user.isCurrentUser && (
            <span className="rounded-md border border-stone-400 bg-stone-300 px-1 py-0.5 text-xs">
              You
            </span>
          )}
        </div>
        <RoleBadge role={props.user.role} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="m-1 rounded-sm px-4 py-3">
          <Skeleton className="h-5 w-48" />
        </div>
      ))}
    </div>
  );
}

function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-md border border-stone-300 bg-stone-100 p-1">
      <button
        onClick={() => setViewMode("members")}
        className={cn(
          "relative rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
          viewMode === "members"
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-600 hover:text-stone-900",
        )}
      >
        <span className="relative z-10">Members</span>
      </button>
      <button
        onClick={() => setViewMode("invitations")}
        className={cn(
          "relative rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
          viewMode === "invitations"
            ? "bg-white text-stone-900 shadow-sm"
            : "text-stone-600 hover:text-stone-900",
        )}
      >
        <span className="relative z-10">Invitations</span>
      </button>
    </div>
  );
}

export function MemberList() {
  const [viewMode, setViewMode] = useState<ViewMode>("members");
  const user = useUser();
  const organization = useOrganization({
    memberships: {
      pageSize: 100,
      keepPreviousData: true,
    },
    invitations: {
      pageSize: 100,
      keepPreviousData: true,
    },
  });

  const memberships = organization.memberships;
  const invitations = organization.invitations;

  const isLoading =
    !organization.isLoaded ||
    !user.isLoaded ||
    !memberships ||
    memberships.isLoading ||
    !invitations ||
    invitations.isLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

      {viewMode === "members" && (
        <>
          {memberships?.data?.length === 0 ? (
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
              {memberships?.data?.map((membership) => (
                <MemberItem
                  key={membership.id}
                  user={{
                    id: membership.id,
                    email: membership.publicUserData.identifier,
                    isCurrentUser:
                      membership.publicUserData.userId === user.user?.id,
                    role: membership.role as Props["user"]["role"],
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === "invitations" && (
        <>
          {invitations?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md">
              <div className="flex flex-col items-center justify-between gap-4 p-4">
                <h1 className="text-2xl font-semibold">
                  No pending invitations
                </h1>
                <p className="text text-stone-500">
                  There are no pending invitations for this workspace.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col rounded-md border border-stone-300 bg-stone-50 shadow">
              {invitations?.data?.map((invitation) => (
                <InvitationItem
                  key={invitation.id}
                  email={invitation.emailAddress}
                  role={invitation.role as Props["user"]["role"]}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
