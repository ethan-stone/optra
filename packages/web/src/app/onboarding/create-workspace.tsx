"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";

type FormInput = {
  name: string;
};

export function CreateWorkspace() {
  const { register, handleSubmit } = useForm<FormInput>();

  const supabase = createClient();

  const createWorkspace = api.workspaces.createPaidWorkspace.useMutation();

  const refreshSession = api.auth.refreshSession.useMutation();

  const router = useRouter();

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    createWorkspace.mutate(data, {
      onSuccess() {
        refreshSession.mutate(undefined, {
          onSuccess(data) {
            supabase.auth
              .setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              })
              .then(() => {
                router.replace("/dashboard");
                router.refresh();
              })
              .catch((error) => {
                console.error(error);
              });
          },
        });
      },
    });
  };

  return (
    <form
      className="flex w-1/2 flex-col pt-24"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h1 className="text-2xl font-bold">New Workspace</h1>
      <h2 className="font-medium text-stone-500">Create a new workspace</h2>
      <div className="mt-12 flex flex-col">
        <h3 className="text-sm font-semibold">Name</h3>
        <Input {...register("name")} placeholder="Workspace Name" />
      </div>
      <Button type="submit" className="mt-4">
        {createWorkspace.isLoading ? "Creating..." : "Create Workspace"}
      </Button>
    </form>
  );
}
