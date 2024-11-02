import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resource } from "sst";

export const createClient = async () => {
  const cookieStore = cookies();

  return createServerClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseAnonKey.value,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error(error);
          }
        },
      },
    },
  );
};
