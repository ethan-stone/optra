import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Resource } from "sst";

export const createAdminClient = async () => {
  return createSupabaseClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseSecretKey.value,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
};
