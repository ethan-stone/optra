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
import { useState } from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";

type InviteMemberFormInput = {
  email: string;
  role: "org:admin" | "org:developer" | "org:member";
};

export function InviteMemberButton() {
  const [isOpen, setIsOpen] = useState(false);

  const inviteMember = api.workspaces.inviteMember.useMutation({
    onSuccess: () => {
      setIsOpen(false);
      reset();
      toast({
        title: "Member Invited",
        description: "Member invited successfully",
      });
    },
  });

  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    control,
  } = useForm<InviteMemberFormInput>();

  const onSubmit: SubmitHandler<InviteMemberFormInput> = async (data) => {
    await inviteMember.mutateAsync({
      email: data.email,
      role: data.role,
    });

    setIsOpen(false);

    reset();

    toast({
      title: "Member Invited",
      description: "Member invited successfully",
    });
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
      >
        <Button
          onClick={() => {
            reset();
            setIsOpen(true);
          }}
        >
          Invite Member
        </Button>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <DialogTitle className="text-2xl font-semibold">
              Invite Member
            </DialogTitle>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">Name</h2>
              <p className="text-sm text-stone-500">
                A human-readable name for the API.
              </p>
              <Input
                {...register("email", { required: true })}
                placeholder="Email"
              />
              {errors.email !== undefined && (
                <p className="text-sm text-red-500">Email is required</p>
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
                name="role"
                rules={{
                  required: true,
                  validate(data) {
                    return (
                      data === "org:admin" ||
                      data === "org:developer" ||
                      data === "org:member"
                    );
                  },
                }}
                render={({ field }) => {
                  return (
                    <Select onValueChange={field.onChange} {...field}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Role</SelectLabel>
                          <SelectItem
                            className="hover:cursor-pointer"
                            value="org:admin"
                          >
                            Admin
                          </SelectItem>
                          <SelectItem
                            className="hover:cursor-pointer"
                            value="org:developer"
                          >
                            Developer
                          </SelectItem>
                          <SelectItem
                            className="hover:cursor-pointer"
                            value="org:member"
                          >
                            Viewer
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.role !== undefined && (
                <p className="text-sm text-red-500">Must select a role</p>
              )}
            </div>
            <Button
              type="submit"
              className="mb-6 mt-2"
              disabled={inviteMember.isLoading}
            >
              {inviteMember.isLoading ? "Inviting..." : "Invite Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
