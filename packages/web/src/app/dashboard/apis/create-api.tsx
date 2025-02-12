"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm, Controller } from "react-hook-form";

type FormInput = {
  apiName: string;
  algorithm: "rsa256" | "hsa256";
};

export function CreateApi() {
  const [isOpen, setIsOpen] = useState(false);

  const { toast } = useToast();

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
      toast({
        title: "API Created",
        description: "API created successfully",
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
          className="py-0 pl-2 text-xs"
          onClick={() => {
            reset();
            setIsOpen(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Create API
        </Button>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <DialogTitle className="text-2xl font-semibold">
              Create API
            </DialogTitle>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">Name</h2>
              <p className="text-sm text-stone-500">
                A human-readable name for the API.
              </p>
              <Input
                {...register("apiName", { required: true })}
                placeholder="API Name"
              />
              {errors.apiName !== undefined && (
                <p className="text-sm text-red-500">API Name is required</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">Signing Algorithm</h2>
              <p className="text-sm text-stone-500">
                The algorithm to use for signing JWTs. This can not be changed
                later.
              </p>
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
                          <SelectItem
                            className="hover:cursor-pointer"
                            value="rsa256"
                          >
                            RSA256 Asymmetric Key
                          </SelectItem>
                          <SelectItem
                            className="hover:cursor-pointer"
                            value="hsa256"
                          >
                            HS256 Symmetric Key
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.algorithm !== undefined && (
                <p className="text-sm text-red-500">Must select an algorithm</p>
              )}
            </div>
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
