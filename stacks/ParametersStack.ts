import { Config, StackContext } from "sst/constructs";

export function ParametersStack({ stack }: StackContext) {
  const DRIZZLE_DATABASE_URL = new Config.Secret(stack, "DRIZZLE_DATABASE_URL");

  const TINY_BIRD_API_KEY = new Config.Secret(stack, "TINY_BIRD_API_KEY");
  const TINY_BIRD_BASE_URL = new Config.Parameter(stack, "TINY_BIRD_BASE_URL", {
    value: "https://api.us-east.aws.tinybird.co",
  });
  const TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT = new Config.Parameter(
    stack,
    "TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT",
    {
      value:
        "https://api.us-east.aws.tinybird.co/v0/pipes/mv__montly_verification__v0_pipe_0905.json",
    }
  );
  const TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT = new Config.Parameter(
    stack,
    "TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT",
    {
      value:
        "https://api.us-east.aws.tinybird.co/v0/pipes/mv__montly_generated__v0_pipe_2798.json",
    }
  );

  const STRIPE_API_KEY = new Config.Secret(stack, "STRIPE_API_KEY");

  return {
    DRIZZLE_DATABASE_URL,
    TINY_BIRD_API_KEY,
    TINY_BIRD_BASE_URL,
    TINY_BIRD_MONTHLY_VERIFICATIONS_ENDPOINT,
    TINY_BIRD_MONTHLY_GENERATIONS_ENDPOINT,
    STRIPE_API_KEY,
  };
}
