import { createTRPCRouter } from "@/server/api/trpc";
import { clientsRouter } from "@/server/api/routers/clients";
import { apisRouter } from "@/server/api/routers/apis";
import { workspaceRouter } from "@/server/api/routers/workspace";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { rootClientsRouter } from "@/server/api/routers/root-clients";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  rootClients: rootClientsRouter,
  apis: apisRouter,
  workspaces: workspaceRouter,
  analytics: analyticsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
