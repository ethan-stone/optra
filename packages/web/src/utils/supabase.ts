import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export const createBrowserClient = () => {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
