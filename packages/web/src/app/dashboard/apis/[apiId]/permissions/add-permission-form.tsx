"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";

type FormInput = {
  name: string;
  description: string;
};

export function AddPermissionForm() {
  const router = useRouter();
  const params = useParams<{ apiId: string }>();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInput>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const addScope = api.apis.addScope.useMutation({
    onSuccess() {
      reset({
        name: "",
        description: "",
      });
      router.refresh();
      toast({
        title: "Permission Added",
        description: "Permission added successfully",
      });
    },
    onError(err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    addScope.mutate({
      apiId: params.apiId,
      description: data.description,
      name: data.name,
    });
  };

  return (
    <form
      className="mb-2 flex flex-row gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-grow flex-col gap-1">
        <h2 className="text-sm font-semibold">Name</h2>
        <p className="text-sm text-stone-500">
          The name of the permission. This must be unique within the API.
        </p>
        <Input
          {...register("name", { required: true, minLength: 1, maxLength: 30 })}
          placeholder="api:create"
        />
        {errors.name !== undefined && (
          <p className="text-sm text-red-500">Name is required</p>
        )}
      </div>
      <div className="flex flex-grow flex-col gap-1">
        <h2 className="text-sm font-semibold">Description</h2>
        <p className="text-sm text-stone-500">
          A description of the permission. This is optional.
        </p>
        <Input {...register("description")} placeholder="Create APIs" />
        {errors.description !== undefined && (
          <p className="text-sm text-red-500">Name is required</p>
        )}
      </div>
      <div className="flex items-end">
        <Button className="flex flex-grow" type="submit">
          {addScope.isLoading ? <Spinner /> : "Add"}
        </Button>
      </div>
    </form>
  );
}
