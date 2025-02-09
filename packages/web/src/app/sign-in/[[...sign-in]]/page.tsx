import { SignIn } from "@clerk/nextjs";

export default async function Pages() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <SignIn forceRedirectUrl="/dashboard" />
    </main>
  );
}
