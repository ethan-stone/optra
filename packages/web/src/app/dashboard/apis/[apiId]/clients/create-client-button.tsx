"use client";

import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";

export function CreateClientButton() {
  const router = useRouter();
  const params = useParams<{ apiId: string }>();

  return (
    <Button
      onClick={() => router.push(`/dashboard/apis/${params.apiId}/clients/new`)}
    >
      Create Client
    </Button>
  );
}
