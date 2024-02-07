import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import * as schema from "@optra/db/schema";
import { connect } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  CLIENT_ID,
  CLIENT_SECRET,
  DRIZZLE_DATABASE_URL,
  INVOICE_WORKSPACE_ARN,
  STRIPE_API_KEY,
  STRIPE_GENERATIONS_PRODUCT_ID,
  STRIPE_PRO_PLAN_PRODUCT_ID,
  STRIPE_VERIFICATIONS_PRODUCT_ID,
  WORKSPACE_ID,
} from "./env";
import { InferInsertModel } from "drizzle-orm";
import { randomUUID } from "crypto";
import Stripe from "stripe";

type InsertWorkspaceBillingInfoInput = InferInsertModel<
  (typeof schema)["workspaceBillingInfo"]
>;

export async function main() {
  const connection = connect({
    url: DRIZZLE_DATABASE_URL,
  });

  const db = drizzle(connection, {
    schema,
  });

  const workspace = await db.query.workspaces.findFirst({
    where: (table, { eq }) => eq(table.id, WORKSPACE_ID),
  });

  if (!workspace) throw new Error("Workspace not found");

  let billingInfo = await db.query.workspaceBillingInfo.findFirst({
    where: (table, { eq }) => eq(table.workspaceId, WORKSPACE_ID),
  });

  if (!billingInfo) {
    console.log("No billing info found, creating new billing info...");
    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    });

    const customer = await stripe.customers.create({
      name: workspace.name,
    });

    await stripe.paymentMethods.attach("pm_card_visa", {
      customer: customer.id,
    });

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: "pm_card_visa",
      },
    });

    // for the purpose of testing, we'll just hardcode the billing info
    // to be more expensive. in reality in the pro tier we have a base
    // usage that is included. anything above that is billed at it's own
    // rate per unit. for testing all usage is the following.

    // .02 cents per generation
    // .01 cents per verificationn
    const billingInfo: InsertWorkspaceBillingInfoInput = {
      id: randomUUID(),
      customerId: customer.id,
      plan: "pro",
      subscriptions: {
        plan: {
          cents: "2500",
          productId: STRIPE_PRO_PLAN_PRODUCT_ID,
          tier: "pro",
        },
        verifications: {
          pricing: [
            {
              minUnits: 1,
              maxUnits: null,
              centsPerUnit: "0.01",
            },
          ],
          productId: STRIPE_VERIFICATIONS_PRODUCT_ID,
        },
        tokens: {
          pricing: [
            {
              minUnits: 1,
              maxUnits: null,
              centsPerUnit: "0.02",
            },
          ],
          productId: STRIPE_GENERATIONS_PRODUCT_ID,
        },
      },
      workspaceId: WORKSPACE_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(schema.workspaceBillingInfo).values(billingInfo);
  }

  console.log("Billing info found.");

  console.log("Generating tokens and verifying them...");

  // generate some tokens
  for (let i = 0; i < 10; i++) {
    await getOAuthToken("http://localhost:8787", CLIENT_ID, CLIENT_SECRET);
  }

  const token = await getOAuthToken(
    "http://localhost:8787",
    CLIENT_ID,
    CLIENT_SECRET
  );

  // verify some tokens
  for (let i = 0; i < 10; i++) {
    await verifyToken("http://localhost:8787", token);
  }

  const lambdaClient = new LambdaClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log("Invoking lambda to create invoices...");

  // this invokes the lambda that is triggered by a cron job
  // to create invoices for the workspace
  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: INVOICE_WORKSPACE_ARN,
      Payload: JSON.stringify({
        id: randomUUID(),
      }),
    })
  );

  console.log("Done!");
}

async function getOAuthToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const req = new Request(`${baseUrl}/v1/oauth/token`, {
    method: "POST",
    body: JSON.stringify({
      grantType: "client_credentials",
      clientId,
      clientSecret,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const res = await fetch(req);

  if (res.status !== 200) {
    throw new Error(
      `Failed to get oauth token. Optra-Request-Id: ${res.headers.get(
        "Optra-Request-Id"
      )}`
    );
  }

  const resJson = (await res.json()) as { accessToken: string };

  return resJson.accessToken;
}

async function verifyToken(baseUrl: string, token: string): Promise<string> {
  const req = new Request(`${baseUrl}/v1/tokens.verifyToken`, {
    method: "POST",
    body: JSON.stringify({
      token: token,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const res = await fetch(req);

  if (res.status !== 200) {
    throw new Error(
      `Failed to get oauth token. Optra-Request-Id: ${res.headers.get(
        "Optra-Request-Id"
      )}`
    );
  }

  const resJson = (await res.json()) as { accessToken: string };

  return resJson.accessToken;
}

main().catch((error) => {
  console.error(error);
});
