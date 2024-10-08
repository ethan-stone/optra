import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_KMS_KEY_ARN: z.string(),
    CF_ACCESS_KEY_ID: z.string(),
    CF_SECRET_ACCESS_KEY: z.string(),
    CF_R2_ENDPOINT: z.string(),
    CF_JWKS_BUCKET_NAME: z.string(),
    OPTRA_WORKSPACE_ID: z.string(),
    OPTRA_API_ID: z.string(),
    CLERK_SECRET_KEY: z.string(),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes("YOUR_URL_HERE"),
        "You forgot to change the default URL",
      ),
    TINY_BIRD_BASE_URL: z.string().url(),
    TINY_BIRD_API_KEY: z.string(),
    TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT: z.string().url(),
    TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_KMS_KEY_ARN: process.env.AWS_KMS_KEY_ARN,
    CF_ACCESS_KEY_ID: process.env.CF_ACCESS_KEY_ID,
    CF_SECRET_ACCESS_KEY: process.env.CF_SECRET_ACCESS_KEY,
    CF_R2_ENDPOINT: process.env.CF_R2_ENDPOINT,
    CF_JWKS_BUCKET_NAME: process.env.CF_JWKS_BUCKET_NAME,
    OPTRA_API_ID: process.env.OPTRA_API_ID,
    OPTRA_WORKSPACE_ID: process.env.OPTRA_WORKSPACE_ID,
    TINY_BIRD_API_KEY: process.env.TINY_BIRD_API_KEY,
    TINY_BIRD_BASE_URL: process.env.TINY_BIRD_BASE_URL,
    TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT:
      process.env.TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT,
    TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT:
      process.env.TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
