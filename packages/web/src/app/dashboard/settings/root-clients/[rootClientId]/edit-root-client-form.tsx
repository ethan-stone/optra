"use client";

import { useToast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";
import { ScopesTable } from "../new/scopes-table";
import { apiLevelScopes, workspaceLevelScopes } from "../default-scopes";
import { useState } from "react";
import { type RowSelectionState } from "@tanstack/react-table";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { api } from "@/trpc/react";

type Props = {
  rootClient: {
    id: string;
    name: string;
    scopes: {
      name: string;
    }[];
  };
  apis: {
    id: string;
    name: string;
    scopes: {
      name: string;
      description: string;
    }[];
  }[];
};

type EditRootClientFormInput = {
  rootClientName: string;
};

export function EditRootClientForm(props: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditRootClientFormInput>({
    defaultValues: {
      rootClientName: props.rootClient.name,
    },
  });

  const { toast } = useToast();

  const updateClient = api.rootClients.update.useMutation({
    onSuccess() {
      router.refresh();
      toast({
        title: "Successfully updated client.",
        description: "Successfully updated the client.",
      });
    },
    onError(err) {
      console.error(err);
      toast({
        title: "Failed to update client.",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit: SubmitHandler<EditRootClientFormInput> = (data) => {
    updateClient.mutate({
      rootClientId: props.rootClient.id,
      name: data.rootClientName,
    });
  };

  const [selectedWorkspaceLevelScopes, setSelectedWorkspaceLevelScopes] =
    useState<RowSelectionState>(
      props.rootClient.scopes.reduce((acc, scope) => {
        const matchingScope = workspaceLevelScopes.find(
          (s) => s.name === scope.name,
        );
        if (matchingScope) {
          acc[matchingScope.name] = true;
        }
        return acc;
      }, {} as RowSelectionState),
    );

  const [selectedApiLevelScopes, setSelectedApiLevelScopes] = useState<
    Record<string, RowSelectionState>
  >(
    props.apis.reduce(
      (acc, api) => {
        const matchingScopes = props.rootClient.scopes.reduce((acc, scope) => {
          const matchingScope = api.scopes.find((s) => s.name === scope.name);
          if (matchingScope) {
            acc[matchingScope.name] = true;
          }
          return acc;
        }, {} as RowSelectionState);

        acc[api.id] = matchingScopes;

        return acc;
      },
      {} as Record<string, RowSelectionState>,
    ),
  );

  const setScopes = api.rootClients.setScopes.useMutation({
    onSuccess() {
      toast({
        description: "Successfully updated scopes.",
        title: "Successfully updated scopes.",
      });
      router.refresh();
    },
    onError(err) {
      console.error(err);
      toast({
        title: "Failed to update scopes.",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">Basic Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
        <div className="flex justify-end">
          <Button type="submit">
            {updateClient.isLoading ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
      <Separator className="mb-5 mt-5" />
      <h1 className="mb-3 text-xl font-semibold">Permissions</h1>
      <h2 className="text-sm font-semibold">Workspace Permissions</h2>
      <p className="mb-3 text-sm text-stone-500">
        Select the scopes that the client has access to.
      </p>
      <div>
        <ScopesTable
          scopes={workspaceLevelScopes.map((scope) => ({
            ...scope,
            id: scope.name,
          }))}
          onRowSelectionChange={(updaterOrValue) => {
            if (typeof updaterOrValue === "function") {
              const newState = updaterOrValue(selectedWorkspaceLevelScopes);
              return setSelectedWorkspaceLevelScopes(newState);
            }
            setSelectedWorkspaceLevelScopes(updaterOrValue);
          }}
          rowSelection={selectedWorkspaceLevelScopes}
        />
      </div>
      <Accordion type="multiple">
        {props.apis.map((api) => {
          return (
            <AccordionItem value={api.id} key={api.id}>
              <AccordionTrigger className="flex flex-row">
                <div className="flex flex-col items-start gap-1">
                  <h2 className="text-sm font-semibold">
                    API {api.name} Permissions
                  </h2>
                  <p className="text-sm font-normal text-stone-500">
                    Permissions that apply to the API {api.name}.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScopesTable
                  key={api.id}
                  scopes={api.scopes.map((scope) => ({
                    ...scope,
                    id: scope.name,
                  }))}
                  onRowSelectionChange={(updaterOrValue) => {
                    if (typeof updaterOrValue === "function") {
                      const newState = updaterOrValue(
                        selectedApiLevelScopes[api.id] ?? {},
                      );
                      return setSelectedApiLevelScopes({
                        ...selectedApiLevelScopes,
                        [api.id]: newState,
                      });
                    }
                    setSelectedApiLevelScopes({
                      ...selectedApiLevelScopes,
                      [api.id]: updaterOrValue,
                    });
                  }}
                  rowSelection={selectedApiLevelScopes[api.id] ?? {}}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="flex justify-end">
        <Button
          className="mt-4"
          type="submit"
          disabled={setScopes.isLoading}
          onClick={() => {
            const selectedScopes: { name: string; description: string }[] = [];

            for (const [apiId, scopes] of Object.entries(
              selectedApiLevelScopes,
            )) {
              for (const [scopeId, selected] of Object.entries(scopes)) {
                if (selected) {
                  selectedScopes.push({
                    name: scopeId,
                    description:
                      apiLevelScopes(apiId).find(
                        (scope) => scope.name === scopeId,
                      )?.description ?? "",
                  });
                }
              }
            }

            for (const [scopeId, selected] of Object.entries(
              selectedWorkspaceLevelScopes,
            )) {
              if (selected) {
                selectedScopes.push({
                  name: scopeId,
                  description:
                    workspaceLevelScopes.find((scope) => scope.name === scopeId)
                      ?.description ?? "",
                });
              }
            }

            setScopes.mutate({
              rootClientId: props.rootClient.id,
              scopes: selectedScopes,
            });
          }}
        >
          {setScopes.isLoading ? "Saving..." : "Save Scopes"}
        </Button>
      </div>
    </div>
  );
}
