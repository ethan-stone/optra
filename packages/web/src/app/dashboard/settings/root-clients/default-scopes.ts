export const workspaceLevelScopes: {
  name: string;
  description: string;
}[] = [
  {
    name: "api:read_api:*",
    description: "Able to read all APIs in the workspace",
  },
  {
    name: "api:create_api:*",
    description: "Able to create APIs in the workspace",
  },
  {
    name: "api:update_api:*",
    description: "Able to update all APIs in the workspace",
  },
  {
    name: "api:delete_api:*",
    description: "Able to delete all APIs in the workspace",
  },
  {
    name: "api:read_client:*",
    description: "Able to read all clients in the workspace",
  },
  {
    name: "api:create_client:*",
    description: "Able to create clients in the workspace",
  },
  {
    name: "api:update_client:*",
    description: "Able to update all clients in the workspace",
  },
  {
    name: "api:delete_client:*",
    description: "Able to delete all clients in the workspace",
  },
];

export const apiLevelScopes = (apiId: string) => [
  {
    name: `api:read_api:${apiId}`,
    description: "Able to read the API",
  },
  {
    name: `api:update_api:${apiId}`,
    description: "Able to update the API",
  },
  {
    name: `api:delete_api:${apiId}`,
    description: "Able to delete the API",
  },
  {
    name: `api:read_client:${apiId}`,
    description: "Able to read all clients in the API",
  },
  {
    name: `api:create_client:${apiId}`,
    description: "Able to create clients in the API",
  },
  {
    name: `api:update_client:${apiId}`,
    description: "Able to update all clients in the API",
  },
  {
    name: `api:delete_client:${apiId}`,
    description: "Able to delete all clients in the API",
  },
];
