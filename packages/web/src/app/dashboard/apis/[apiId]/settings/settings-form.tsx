"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SettingsFormProps = {
  apiId: string;
  apiName: string;
  tokenExpirationInSeconds: number;
};

export function SettingsForm(props: SettingsFormProps) {
  const [tokenExpirationInSeconds, setTokenExpirationInSeconds] = useState(
    props.tokenExpirationInSeconds,
  );
  const [apiName, setApiName] = useState(props.apiName);

  const router = useRouter();

  const updateApi = api.apis.updateApi.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      console.error(err);
      alert(err.message);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2>Name</h2>
        <Input
          type="string"
          value={apiName}
          onChange={(e) => setApiName(e.target.value)}
        />
      </div>
      <div>
        <h2>Token Expiration</h2>
        <Input
          type="number"
          value={tokenExpirationInSeconds}
          onChange={(e) =>
            setTokenExpirationInSeconds(parseInt(e.target.value))
          }
        />
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          updateApi.mutate({
            id: props.apiId,
            tokenExpirationInSeconds,
            name: apiName,
          });
        }}
      >
        {updateApi.isLoading ? "Updating..." : "Update"}
      </Button>
    </div>
  );
}
