import { createClient } from "@/server/supabase/server-client";
import { verify } from "jsonwebtoken";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Resource } from "sst";

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
