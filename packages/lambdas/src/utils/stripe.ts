import { Stripe } from "stripe";
import { Resource } from "sst";

export const stripe = new Stripe(Resource.StripeApiKey.value, {
  apiVersion: "2023-10-16",
});
