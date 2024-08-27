import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "@/env";
import { schema } from "@optra/db/index";

export const db = drizzle(postgres(env.DATABASE_URL), { schema });
