import { getApiByWorkspaceIdAndApiId } from "@/server/data/apis";
import { getWorkspaceByTenantId } from "@/server/data/workspaces";
import { getTenantId } from "@/utils/auth";
import { notFound } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { Separator } from "@/components/ui/separator";
import { SigningSecrets } from "./signing-secrets";
import { PublicKeyUrl } from "./public-key-url";
import { env } from "@/env";

type ApiSettingsProps = {
  params: { apiId: string };
};

export default async function Settings(props: ApiSettingsProps) {
  const tenantId = await getTenantId();

  const workspace = await getWorkspaceByTenantId(tenantId);

  if (!workspace) {
    return notFound();
  }

  const api = await getApiByWorkspaceIdAndApiId(
    workspace.id,
    props.params.apiId,
  );

  if (!api) {
    return notFound();
  }

  const publicKeyUrl = `${env.AWS_S3_ENDPOINT}/jwks/${workspace.id}/${api.id}/.well-known/jwks.json`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-stone-500">
          Update the settings for your API.
        </p>
      </div>
      <SettingsForm
        apiId={api.id}
        apiName={api.name}
        tokenExpirationInSeconds={api.tokenExpirationInSeconds}
      />
      <Separator />
      <SigningSecrets
        apiId={api.id}
        currentSigningSecret={api.currentSigningSecret}
        nextSigningSecret={api.nextSigningSecret}
      />
      {api.currentSigningSecret.algorithm === "rsa256" ? (
        <>
          <Separator />
          <PublicKeyUrl publicKeyUrl={publicKeyUrl} />
        </>
      ) : null}
    </div>
  );
}
