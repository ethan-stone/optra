import { redirect } from "next/navigation";
import { CreateWorkspace } from "./create-workspace";
import { createServerClient } from "@/server/supabase/server-client";
import { newLogger } from "@/server/logger";

export default async function Onboarding() {
  const logger = newLogger({
    namespace: "/onboarding",
  });

  logger.info("Onboarding page accessed");

  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.info("No user found. Redirecting to sign-up");
    return redirect("/sign-up");
  }

  logger.info(`User found: ${user.id}. Checking for free workspace`, {
    userId: user.id,
  });

  return (
    <main className="flex min-h-screen flex-col items-center">
      <CreateWorkspace />
    </main>
  );
}
