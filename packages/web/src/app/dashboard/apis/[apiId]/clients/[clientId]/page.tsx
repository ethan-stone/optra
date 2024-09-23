import { useState } from "react";
import { notFound, redirect, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/icons/spinner";
import { type PropsWithChildren } from "react";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getClientByWorkspaceIdAndClientId } from "@/server/data/clients";
import { getTenantId } from "@/utils/auth";

type ClientPageProps = PropsWithChildren<{
  params: { apiId: string; clientId: string };
}>;

export default async function EditClientPage({ params }: ClientPageProps) {
  const tenantId = getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return redirect("/onboarding");
  }

  const client = await getClientByWorkspaceIdAndClientId(
    workspace.id,
    params.clientId,
  );

  if (!client) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Edit Client: {client.name}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="mb-2 block font-medium">
            Client Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <h2 className="mb-2 font-medium">Permissions</h2>
          <div className="space-y-2">
            {["read", "write", "delete"].map((permission) => (
              <div key={permission} className="flex items-center">
                <Checkbox
                  id={permission}
                  checked={permissions.includes(permission)}
                  onCheckedChange={() => handlePermissionChange(permission)}
                />
                <label htmlFor={permission} className="ml-2">
                  {permission.charAt(0).toUpperCase() + permission.slice(1)}
                </label>
              </div>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={updateClient.isLoading}>
          {updateClient.isLoading ? <Spinner /> : "Update Client"}
        </Button>
      </form>
    </div>
  );
}
