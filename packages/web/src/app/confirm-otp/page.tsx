import { notFound } from "next/navigation";
import { ConfirmOtpForm } from "./form";

type Props = {
  searchParams: {
    email?: string;
    type?: "sign-in" | "sign-up";
  };
};

export default async function ConfirmOtp({ searchParams }: Props) {
  const email = searchParams.email;
  const type = searchParams.type;

  if (!email || !type) {
    return notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <ConfirmOtpForm email={email} type={type} />
    </main>
  );
}
