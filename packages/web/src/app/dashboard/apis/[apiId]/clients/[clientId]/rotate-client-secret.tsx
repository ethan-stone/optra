"use client";

import { useToast } from "@/components/hooks/use-toast";
import { EyeIcon } from "@/components/icons/eye";
import { EyeSlashIcon } from "@/components/icons/eye-slash";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";

type FormInput = {
  expiresAtOption: "immediately" | "3_days" | "1_week" | "1_month" | "custom";
  expiresAtDate?: string;
};

export function RotateClientSecret({ clientId }: { clientId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const { toast } = useToast();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput>({
    defaultValues: {
      expiresAtOption: "immediately",
    },
  });

  const router = useRouter();

  const rotateClientSecret = api.clients.rotateClientSecret.useMutation({
    onSuccess(data) {
      setNewSecret(data.secret);
      router.refresh();
      reset();
      toast({
        title: "Client Secret Rotated",
        description: "Client secret rotated successfully",
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

  const watchExpiresAtOption = watch("expiresAtOption");

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    const now = new Date();

    rotateClientSecret.mutate({
      id: clientId,
      expiresAt:
        data.expiresAtOption === "custom" && data.expiresAtDate
          ? new Date(data.expiresAtDate).toISOString()
          : data.expiresAtOption === "immediately"
            ? now.toISOString()
            : data.expiresAtOption === "3_days"
              ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
              : data.expiresAtOption === "1_week"
                ? new Date(
                    now.getTime() + 7 * 24 * 60 * 60 * 1000,
                  ).toISOString()
                : new Date(
                    now.getTime() + 30 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
    });
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          reset();
          setIsOpen(open);
        }}
      >
        <Button onClick={() => setIsOpen(true)}>Rotate</Button>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-2xl font-semibold">
            Rotate Client Secret
          </DialogTitle>
          {newSecret ? (
            <div className="mt-2">
              <p className="font-semibold">New Secret</p>
              <pre className="inlineflex ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted px-2.5 py-2 font-mono text-sm text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
                <pre>
                  {showSecret ? newSecret : "********************************"}
                </pre>
                <div>
                  <Button
                    className="w-min bg-transparent hover:bg-stone-200"
                    onClick={() => setShowSecret((prevVal) => !prevVal)}
                  >
                    {showSecret ? <EyeSlashIcon /> : <EyeIcon />}
                  </Button>
                  <Button
                    className="w-min bg-transparent hover:bg-stone-200"
                    onClick={() => navigator.clipboard.writeText(newSecret)}
                  >
                    <Copy className="h-5 w-5 text-stone-900" />
                  </Button>
                </div>
              </pre>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="flex flex-row justify-between gap-2">
                <p className="w-2/3 text-sm text-stone-500">
                  Choose an optional date at which the old secret will expire.
                </p>
                <Controller
                  control={control}
                  name="expiresAtOption"
                  rules={{
                    required: true,
                    validate(data) {
                      return (
                        data === "immediately" ||
                        data === "3_days" ||
                        data === "1_week" ||
                        data === "1_month" ||
                        data === "custom"
                      );
                    },
                  }}
                  render={({ field }) => {
                    return (
                      <Select
                        onValueChange={field.onChange}
                        {...field}
                        defaultValue="immediately"
                      >
                        <SelectTrigger className="w-1/3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="immediately">
                              Immediately
                            </SelectItem>
                            <SelectItem value="3_days">3 Days</SelectItem>
                            <SelectItem value="1_week">1 Week</SelectItem>
                            <SelectItem value="1_month">1 Month</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
              {watchExpiresAtOption === "immediately" && (
                <p className="text-sm text-yellow-700">
                  It may take up to a minute for the secret to expire.
                </p>
              )}
              {watchExpiresAtOption === "custom" && (
                <>
                  <div className="flex flex-row items-center justify-between gap-2">
                    <p className="text-nowrap text-sm text-stone-500">
                      Expires in (Local time)
                    </p>
                    <Input
                      className="w-fit"
                      type="datetime-local"
                      {...register("expiresAtDate", {
                        validate(data) {
                          if (!data) {
                            return true;
                          }
                          const now = new Date();
                          const expiresAt = new Date(data);
                          return expiresAt > now;
                        },
                      })}
                    />
                  </div>
                  {errors.expiresAtDate !== undefined && (
                    <p className="text-sm text-red-500">
                      Expires at date must be in the future and is required if
                      custom.
                    </p>
                  )}
                </>
              )}
              <Button
                type="submit"
                disabled={rotateClientSecret.isLoading}
                className="mt-2"
              >
                {rotateClientSecret.isLoading ? "Rotating..." : "Rotate"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
