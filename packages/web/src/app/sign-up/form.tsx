"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

type FormInput = {
  email: string;
};

export function SignUpForm() {
  const { register, handleSubmit } = useForm<FormInput>();

  const router = useRouter();

  const signUp = api.auth.signIn.useMutation();

  const onSubmit = (data: FormInput) => {
    signUp.mutate(data, {
      onSuccess: (data) => {
        router.push(`/confirm-otp?email=${data.email}&type=sign-up`);
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-2/3 flex-col gap-4 rounded-md border border-stone-300 bg-stone-50 p-4 shadow md:w-1/2 xl:w-1/4"
    >
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Email</h2>
        <Input {...register("email")} />
      </div>
      <Button type="submit" disabled={signUp.isLoading}>
        {signUp.isLoading ? "Sending..." : "Send OTP"}
      </Button>
    </form>
  );
}
