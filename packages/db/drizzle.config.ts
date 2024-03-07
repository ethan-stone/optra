import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  driver: "turso",
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL!,
    authToken: process.env.DRIZZLE_DATABASE_TOKEN!,
  },
} satisfies Config;
