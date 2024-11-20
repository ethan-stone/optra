import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { Resource } from "sst";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_KMS_KEY_ARN: z.string(),
    JWKS_BASE_URL: z.string(),
    AWS_S3_JWKS_BUCKET_NAME: z.string(),
    AWS_SCHEDULER_ROLE_ARN: z.string(),
    AWS_SCHEDULER_FAILED_DLQ_ARN: z.string(),
    AWS_MESSAGE_QUEUE_ARN: z.string(),
    OPTRA_WORKSPACE_ID: z.string(),
    OPTRA_API_ID: z.string(),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes("YOUR_URL_HERE"),
        "You forgot to change the default URL",
      ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPABASE_URL: z.string(),
    SUPABASE_ANON_KEY: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: Resource.DbUrl.value,
    NODE_ENV: process.env.NODE_ENV,
    AWS_ACCESS_KEY_ID: Resource.AWSAccessKeyId.value,
    AWS_SECRET_ACCESS_KEY: Resource.AWSSecretAccessKey.value,
    AWS_KMS_KEY_ARN: process.env.AWS_KMS_KEY_ARN,
    JWKS_BASE_URL: process.env.JWKS_BASE_URL,
    AWS_S3_JWKS_BUCKET_NAME: Resource.JwksBucket.name,
    AWS_SCHEDULER_ROLE_ARN: process.env.AWS_SCHEDULER_ROLE_ARN,
    AWS_SCHEDULER_FAILED_DLQ_ARN: process.env.AWS_SCHEDULER_FAILED_DLQ_ARN,
    AWS_MESSAGE_QUEUE_ARN: process.env.AWS_MESSAGE_QUEUE_ARN,
    OPTRA_API_ID: Resource.OptraApiId.value,
    OPTRA_WORKSPACE_ID: Resource.OptraWorkspaceId.value,
    SUPABASE_URL: Resource.SupabaseUrl.value,
    SUPABASE_ANON_KEY: Resource.SupabaseAnonKey.value,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
