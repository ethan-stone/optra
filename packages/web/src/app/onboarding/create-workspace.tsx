"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";

type FormInput = {
  name: string;
};

export function CreateWorkspace() {
  const { register, handleSubmit } = useForm<FormInput>();

  const { setActive } = useOrganizationList();

  const createWorkspace = api.workspaces.createPaidWorkspace.useMutation();

  const router = useRouter();

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    createWorkspace.mutate(data, {
      async onSuccess(result) {
        console.log("onSuccess", result);

        if (!setActive) {
          throw new Error("setActive is not defined");
        }

        await setActive({
          organization: result.tenantId,
        });

        router.replace("/dashboard");
        router.refresh();
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
