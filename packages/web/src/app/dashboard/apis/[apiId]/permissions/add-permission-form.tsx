"use client";

import { Spinner } from "@/components/icons/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(3),
  description: z.string().min(3).optional(),
});

export function AddPermissionForm() {
  const router = useRouter();
  const params = useParams<{ apiId: string }>();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const addScope = api.apis.addScope.useMutation({
    onSuccess() {
      setName("");
      setDesc("");
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  return (
    <div className="mb-2 flex flex-row gap-4">
      <div className="flex flex-grow flex-col gap-1">
        Name
        <Input
          placeholder="api:create"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-grow flex-col gap-1">
        Description
        <Input
          placeholder="Create APIs"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <Button
          className="flex flex-grow"
          onClick={() => {
            const valid = schema.safeParse({ name, description: desc });

            if (!valid.success) {
              alert("Name must be at least 3 characters long");
              return;
            }

            addScope.mutate({
              apiId: params.apiId,
              name: name,
              description: desc,
            });
          }}
        >
          {addScope.isLoading ? <Spinner /> : "Add"}
        </Button>
      </div>
    </div>
  );
}
