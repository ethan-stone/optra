"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm, Controller } from "react-hook-form";

type FormInput = {
  apiName: string;
  algorithm: "rsa256" | "hsa256";
};

export function CreateApi() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FormInput>();

  const createApi = api.apis.createApi.useMutation({
    onSuccess() {
      setIsOpen(false);
      router.refresh();
      reset({});
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    createApi.mutate({
      name: data.apiName,
      algorithm: data.algorithm,
    });
  };

  const router = useRouter();

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
      >
        <Button
          className="mb-6 mt-2"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          Create API
        </Button>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <h2 className="text-2xl font-semibold">Create API</h2>
            <Input
              {...register("apiName", { required: true })}
              placeholder="API Name"
            />
            {errors.apiName !== undefined && (
              <p className="text-sm text-red-500">API Name is required</p>
            )}
            <Controller
              control={control}
              name="algorithm"
              rules={{
                required: true,
                validate(data) {
                  return data === "rsa256" || data === "hsa256";
                },
              }}
              render={({ field }) => {
                return (
                  <Select onValueChange={field.onChange} {...field}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a signing algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Signing Algorithm</SelectLabel>
                        <SelectItem value="rsa256">RSA256</SelectItem>
                        <SelectItem value="hsa256">HSA256</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {errors.algorithm !== undefined && (
              <p className="text-sm text-red-500">Must select an algorithm</p>
            )}
            <Button
              type="submit"
              className="mb-6 mt-2"
              disabled={createApi.isLoading}
            >
              {createApi.isLoading ? "Creating..." : "Create API"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
