"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

type FormInput = {
  otp: string;
};

type Props = {
  email: string;
  type: "sign-in" | "sign-up";
};

export function ConfirmOtpForm({ email, type }: Props) {
  const supabase = createClient();

  const { register, handleSubmit } = useForm<FormInput>();

  const confirmOtp = api.auth.confirmOtp.useMutation();

  const router = useRouter();

  const onSubmit = async (data: FormInput) => {
    confirmOtp.mutate(
      { email, otp: data.otp },
      {
        onSuccess: (data) => {
          supabase.auth
            .setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            })
            .then(() => {
              if (type === "sign-up") {
                router.replace("/onboarding");
              } else {
                router.replace("/dashboard");
              }
            })
            .catch((error) => {
              console.error(error);
            });
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-2/3 flex-col gap-4 rounded-md border border-stone-300 bg-stone-50 p-4 shadow md:w-1/2 xl:w-1/4"
    >
      <h1 className="text-2xl font-semibold">Confirm OTP</h1>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">OTP</h2>
        <Input {...register("otp")} />
      </div>
      <Button type="submit" disabled={confirmOtp.isLoading}>
        {confirmOtp.isLoading ? "Confirming..." : "Confirm"}
      </Button>
    </form>
  );
}
