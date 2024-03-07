import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { env } from "@/env";
import { schema } from "@optra/db";

export const db = drizzle(
  createClient({
    url: env.DATABASE_URL,
    // authToken: env.DRIZZLE_AUTH_TOKEN,
  }),
  { schema },
);
