import { createClient } from "@/utils/supabase";
import { type User as _User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { z } from "zod";

export type User = _User & {
  activeWorkspaceId: string | null;
};

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user: _user },
      } = await supabase.auth.getUser();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!_user || !session) return null;

      const jwt = jwtDecode(session.access_token);

      const jwtData = z
        .object({
          active_workspace_id: z.string().nullable(),
        })
        .parse(jwt);

      const user: User = {
        ..._user,
        activeWorkspaceId: jwtData.active_workspace_id ?? null,
      };

      return { user };
    },
  });
}
