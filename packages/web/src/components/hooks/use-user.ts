import { createClient } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      return { user };
    },
  });
}
