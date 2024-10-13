"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";

type SettingsFormProps = {
  apiId: string;
  apiName: string;
  tokenExpirationInSeconds: number;
};

type FormInput = {
  apiName: string;
  tokenExpirationInSeconds: number;
};

export function SettingsForm(props: SettingsFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    defaultValues: {
      apiName: props.apiName,
      tokenExpirationInSeconds: props.tokenExpirationInSeconds,
    },
  });

  const { toast } = useToast();

  const updateApi = api.apis.updateApi.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "API Updated",
        description: "API updated successfully",
      });
    },
    onError(err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    updateApi.mutate({
      id: props.apiId,
      name: data.apiName,
      tokenExpirationInSeconds: data.tokenExpirationInSeconds,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded border border-stone-300 px-4 py-3 shadow">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2>Name</h2>
          <Input
            {...register("apiName", {
              required: true,
              minLength: 1,
              maxLength: 100,
            })}
            type="string"
          />
          {errors.apiName !== undefined && (
            <p className="text-sm text-red-500">Name is required</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h2>Token Expiration In Seconds</h2>
          <Input
            {...register("tokenExpirationInSeconds", { required: true })}
            type="number"
          />
          {errors.tokenExpirationInSeconds !== undefined && (
            <p className="text-sm text-red-500">Token expiration is required</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="mt-4">
            {updateApi.isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
