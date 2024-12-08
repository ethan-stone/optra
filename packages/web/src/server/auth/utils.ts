import { createClient } from "@/server/supabase/server-client";
import { verify } from "jsonwebtoken";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Resource } from "sst";
import { type User as _User } from "@supabase/supabase-js";

export type User = _User & {
  activeWorkspaceId: string | null;
  role: "admin" | "developer" | "viewer";
};

export async function getTenantId() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let activeWorkspaceId: string | null = null;

  if (session) {
    const decoded = verify(
      session.access_token,
      Resource.SupabaseJwtSecret.value,
    );

    const parsedDecoded = z
      .object({
        active_workspace_id: z.string().nullable(),
        role: z.enum(["admin", "developer", "viewer"]),
      })
      .parse(decoded);

    activeWorkspaceId = parsedDecoded.active_workspace_id;
  }

  return activeWorkspaceId ?? user?.id ?? notFound();
}

export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session) {
    return null;
  }

  const decoded = verify(
    session.access_token,
    Resource.SupabaseJwtSecret.value,
  );

  const parsedDecoded = z
    .object({
      active_workspace_id: z.string().nullable(),
      role: z.enum(["admin", "developer", "viewer"]),
    })
    .parse(decoded);

  return {
    ...user,
    activeWorkspaceId: parsedDecoded.active_workspace_id,
    role: parsedDecoded.role,
  };
}
