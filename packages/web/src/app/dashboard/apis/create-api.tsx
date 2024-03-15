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

export function CreateApi() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiName, setApiName] = useState("");
  const [algorithm, setAlgorithm] = useState("");

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
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Create API</h2>
            <Input
              type="text"
              value={apiName}
              placeholder="API Name"
              onChange={(e) => setApiName(e.target.value)}
            />
            <Select onValueChange={(e) => setAlgorithm(e)}>
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
            <Button
              className="mb-6 mt-2"
              disabled={createApi.isLoading}
              onClick={() => {
                createApi.mutate({
                  name: apiName,
                  algorithm: algorithm as "rsa256" | "hsa256",
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
