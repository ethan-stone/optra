import path from "path";
import { fileURLToPath } from "url";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../",
    ),
  },
};

export default config;
