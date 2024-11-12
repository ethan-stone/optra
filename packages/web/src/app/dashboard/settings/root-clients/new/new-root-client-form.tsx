"use client";

import { useToast } from "@/components/hooks/use-toast";
import { EyeIcon } from "@/components/icons/eye";
import { EyeSlashIcon } from "@/components/icons/eye-slash";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

type FormInput = {
  rootClientName: string;
};

export function NewRootClientForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const { toast } = useToast();

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInput>({
    defaultValues: {
      rootClientName: "",
    },
  });

  const createRootClient = api.clients.createRootClient.useMutation({
    onSuccess(data) {
      setClientId(data.clientId);
      setClientSecret(data.clientSecret);
      setIsOpen(true);
      router.refresh();
      reset({
        rootClientName: "",
      });
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    createRootClient.mutate({
      name: data.rootClientName,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setClientId("");
        setClientSecret("");
        setShowSecret(false);
      }}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Name</h2>
          <p className="text-sm text-stone-500">
            A human-readable name for the client.
          </p>
          <Input
            {...register("rootClientName", {
              required: true,
              minLength: 1,
              maxLength: 100,
            })}
            placeholder="Root Client Name"
          />
          {errors.rootClientName !== undefined && (
            <p className="text-sm text-red-500">A client name is required</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={
            Object.keys(errors).length > 0 || createRootClient.isLoading
          }
        >
          {createRootClient.isLoading ? "Creating..." : "Create Root Client"}
        </Button>
      </form>
      <DialogContent>
        <div className="mt-2">
          <p className="font-semibold">Client ID</p>
          <pre className="inlineflex ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted px-2.5 py-2 font-mono text-sm text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
            <pre>{clientId}</pre>
            <div>
              <Button
                className="w-min bg-transparent hover:bg-stone-200"
                onClick={async () => {
                  await navigator.clipboard.writeText(clientId);
                  toast({
                    title: "Copied to clipboard",
                    description: "Client ID has been copied to clipboard",
                  });
                }}
              >
                <Copy className="h-5 w-5 text-stone-900" />
              </Button>
            </div>
          </pre>
        </div>
        <div className="mb-4">
          <p className="font-semibold">Client Secret</p>
          <pre className="inlineflex ph-no-capture flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted px-2.5 py-2 font-mono text-sm text-primary transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-sm:text-xs sm:overflow-hidden">
            <pre>
              {showSecret ? clientSecret : "********************************"}
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
                onClick={async () => {
                  await navigator.clipboard.writeText(clientSecret);
                  toast({
                    title: "Copied to clipboard",
                    description: "Client secret has been copied to clipboard",
                  });
                }}
              >
                <Copy className="h-5 w-5 text-stone-900" />
              </Button>
            </div>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
