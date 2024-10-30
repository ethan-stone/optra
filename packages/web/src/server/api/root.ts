import { createTRPCRouter } from "@/server/api/trpc";
import { clientsRouter } from "@/server/api/routers/clients";
import { apisRouter } from "@/server/api/routers/apis";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  apis: apisRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
