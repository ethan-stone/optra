export const backend = new sst.aws.Function("DashboardBackend", {
  handler: "packages/dashboard/backend/src/index.handler",
});

export const frontend = new sst.aws.StaticSite("DashboardFrontend", {
  path: "packages/dashboard/frontend/dist",
  build: {
    output: "packages/dashboard/frontend/dist",
    command: "pnpm run build",
  },
});
