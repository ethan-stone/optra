import { Stripe } from "stripe";
import { Config } from "sst/node/config";

export const stripe = new Stripe(Config.STRIPE_API_KEY, {
  apiVersion: "2023-10-16",
});
