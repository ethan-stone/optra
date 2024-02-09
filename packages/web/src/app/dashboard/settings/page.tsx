"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useState } from "react";

export default function Settings() {
  const [apiName, setApiName] = useState("");

  const createRootClient = api.clients.createRootClient.useMutation({
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-1/2 flex-col py-10">
        <h1 className="flex text-4xl">Settings</h1>
        <p className="py-2 font-thin">Manage your workspace</p>
        <Input
          type="text"
          value={apiName}
          placeholder="API Name"
          onChange={(e) => setApiName(e.target.value)}
        />
        <Button
          className="my-2"
          disabled={createRootClient.isLoading}
          onClick={() =>
            createRootClient.mutate({
              name: apiName,
            })
          }
        >
          {createRootClient.isLoading ? "Creating..." : "Create Root Client"}
        </Button>
      </div>
    </main>
  );
}
