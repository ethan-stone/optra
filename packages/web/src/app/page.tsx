import { SignInButton, UserButton, auth } from "@clerk/nextjs";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

export default async function Home() {
  const { user } = auth();
  noStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Optra
        </h1>
        <Link href="/dashboard">Dashboard</Link>
        {user ? <SignInButton /> : null}
        <UserButton afterSignOutUrl="/" />
      </div>
    </main>
  );
}
