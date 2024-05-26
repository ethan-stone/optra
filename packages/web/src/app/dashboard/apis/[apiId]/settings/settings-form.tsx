"use client";

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

  const updateApi = api.apis.updateApi.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    updateApi.mutate({
      id: props.apiId,
      name: props.apiName,
      tokenExpirationInSeconds: data.tokenExpirationInSeconds,
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
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
      <div>
        <h2>Token Expiration</h2>
        <Input
          {...register("tokenExpirationInSeconds", { required: true })}
          type="number"
        />
        {errors.tokenExpirationInSeconds !== undefined && (
          <p className="text-sm text-red-500">Token expiration is required</p>
        )}
      </div>
      <Button type="submit" className="mt-4">
        {updateApi.isLoading ? "Updating..." : "Update"}
      </Button>
    </form>
  );
}
