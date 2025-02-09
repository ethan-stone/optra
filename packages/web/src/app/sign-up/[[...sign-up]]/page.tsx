import { SignUp } from "@clerk/nextjs";

export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <SignUp forceRedirectUrl="/onboarding" />
    </main>
  );
}
