"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function ApiItem(props: { id: string; name: string }) {
  const router = useRouter();

  return (
    <div className="hover:bg-stone-100">
      <div className="flex flex-row items-center justify-between space-y-1 px-4 py-5">
        <h4 className="font-medium leading-none">{props.name}</h4>
        <div className="flex flex-row items-center gap-4">
          <p className="w-min rounded bg-stone-200 px-2 py-1 font-mono text-xs">
            {props.id}
          </p>
          <Button
            className="bg-red-500 hover:bg-red-700"
            onClick={() => console.log("clicked")}
          >
            Delete
          </Button>
        </div>
      </div>
      <Separator />
    </div>
  );
}

type Props = {
  data: { id: string; name: string }[];
};

export function Apis(props: Props) {
  const [apiName, setApiName] = useState("");

  const router = useRouter();

  const createApi = api.apis.createApi.useMutation({
    onSuccess() {
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
      <Input
        type="text"
        value={apiName}
        placeholder="API Name"
        onChange={(e) => setApiName(e.target.value)}
      />
      <Button
        className="mb-6 mt-2"
        disabled={createApi.isLoading}
        onClick={() =>
          createApi.mutate({
            name: apiName,
            algorithm: "rsa256",
          })
        }
      >
        {createApi.isLoading ? "Creating..." : "Create API"}
      </Button>
      {props.data.map((api, idx) => (
        <ApiItem key={idx} id={api.id} name={api.name} />
      ))}
    </>
  );
}
