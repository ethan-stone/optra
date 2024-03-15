"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateApi() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiName, setApiName] = useState("");

  const router = useRouter();

  const createApi = api.apis.createApi.useMutation({
    onSuccess() {
      setIsOpen(false);
      setApiName("");
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          setApiName("");
        }}
      >
        <Button
          className="mb-6 mt-2"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {createApi.isLoading ? "Creating..." : "Create API"}
        </Button>
        <DialogContent>
          <div className="mt-6 flex flex-col">
            <Input
              type="text"
              value={apiName}
              placeholder="API Name"
              onChange={(e) => setApiName(e.target.value)}
            />
            <Button
              className="mb-6 mt-2"
              disabled={createApi.isLoading}
              onClick={() => {
                createApi.mutate({
                  name: apiName,
                  algorithm: "rsa256",
                });
              }}
            >
              {createApi.isLoading ? "Creating..." : "Create API"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
