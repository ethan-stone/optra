"use client";

import { Button } from "@/components/ui/button";
import { useOrganization, useSignIn, useSignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

export function InviteAccept() {
  const signUp = useSignUp();
  const signIn = useSignIn();
  const organization = useOrganization();

  const token = useSearchParams().get("__clerk_ticket");
  const accountStatus = useSearchParams().get("__clerk_status");

  useEffect(() => {
    if (
      !signIn.signIn ||
      !signIn.setActive ||
      !token ||
      organization ||
      accountStatus !== "sign_in"
    ) {
      return;
    }

    const createSignIn = async () => {
      try {
        // Create a new `SignIn` with the supplied invitation token.
        // Make sure you're also passing the ticket strategy.
        const signInAttempt = await signIn.signIn.create({
          strategy: "ticket",
          ticket: token,
        });

        // If the sign-in was successful, set the session to active
        if (signInAttempt.status === "complete") {
          await signIn.setActive({
            session: signInAttempt.createdSessionId,
          });
        } else {
          // If the sign-in attempt is not complete, check why.
          // User may need to complete further steps.
          console.error(JSON.stringify(signInAttempt, null, 2));
        }
      } catch (err) {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        console.error("Error:", JSON.stringify(err, null, 2));
      }
    };

    void createSignIn();
  }, [accountStatus, organization, signIn, token]);

  if (!token) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-stone-300 bg-stone-50 p-8 shadow">
        <h1 className="text-2xl font-semibold text-stone-900">
          Invalid Invite
        </h1>
        <p className="mt-2 text-center text-stone-500">
          This invite link appears to be invalid or has expired.
        </p>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp.signUp) {
      return;
    }

    try {
      const signUpAttempt = await signUp.signUp.create({
        strategy: "ticket",
        ticket: token,
      });

      if (signUpAttempt.status === "complete") {
        await signUp.setActive({
          session: signUpAttempt.createdSessionId,
        });
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (error) {
      console.error("Error:", JSON.stringify(error, null, 2));
    }
  };

  if (accountStatus === "sign_in" && !organization.organization) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-stone-300 bg-stone-50 p-8 shadow">
        <h1 className="text-2xl font-semibold text-stone-900">Signing In...</h1>
        <p className="mt-2 text-center text-stone-500">
          Please wait while we sign you into your account.
        </p>
      </div>
    );
  }

  if (accountStatus === "sign_up" && !organization.organization) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-stone-300 bg-stone-50 p-8 shadow">
        <h1 className="text-2xl font-semibold text-stone-900">Accept Invite</h1>
        <p className="mb-6 mt-2 text-center text-stone-500">
          You&apos;ve been invited to join this workspace. Create an account to
          get started.
        </p>
        <Button onClick={handleSignUp} className="min-w-[200px]">
          Create Account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-stone-300 bg-stone-50 p-8 shadow">
      <h1 className="text-2xl font-semibold text-stone-900">Welcome!</h1>
      <p className="mt-2 text-center text-stone-500">
        You&apos;ve successfully joined the workspace. You&apos;ll be redirected
        shortly.
      </p>
    </div>
  );
}
