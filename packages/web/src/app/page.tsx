import { Button } from "@/components/ui/button";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

export default async function Home() {
  noStore();

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="container flex max-w-5xl flex-col items-center gap-12 px-4 py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            API Key Management,{" "}
            <span className="text-stone-500">Made Simple</span>
          </h1>
          <p className="max-w-2xl text-lg text-stone-600">
            Secure, scalable, and easy-to-use API key management for your
            applications. Generate, verify, and manage API keys with confidence.
          </p>
          <div className="flex flex-row gap-4">
            <Button asChild size="lg" className="px-8">
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-stone-300 px-8"
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border border-stone-300 bg-stone-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Secure by Default</h3>
            <p className="text-stone-600">
              Industry-standard security practices built in. Your API keys are
              always protected.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-stone-300 bg-stone-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Team Collaboration</h3>
            <p className="text-stone-600">
              Invite team members, assign roles, and manage access all in one
              place.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-stone-300 bg-stone-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Usage Analytics</h3>
            <p className="text-stone-600">
              Track API key usage, monitor activity, and get insights into your
              API usage.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 flex flex-col items-center gap-6 rounded-lg border border-stone-300 bg-stone-50 p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold">Ready to get started?</h2>
          <p className="max-w-2xl text-stone-600">
            Join thousands of developers who trust Optra for their API key
            management needs.
          </p>
          <Button asChild size="lg" className="px-8">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
