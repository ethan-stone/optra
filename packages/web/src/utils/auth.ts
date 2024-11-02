import { createClient } from "@/server/supabase/server-client";
import { notFound } from "next/navigation";

export async function getTenantId() {
  const supabase = await createClient();

  console.log("here 5");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("here 6", user?.id);

  return user?.id ?? notFound();
}
