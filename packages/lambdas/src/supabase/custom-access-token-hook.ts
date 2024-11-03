import { getDrizzle } from "@optra/core/drizzle";
import { DrizzleUserRepo } from "@optra/core/users";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { Resource } from "sst";
import { Webhook } from "standardwebhooks";
import { z } from "zod";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const { db } = await getDrizzle(Resource.DbUrl.value);
  const userRepo = new DrizzleUserRepo(db);

  const payload = event.body;

  if (!payload) {
    console.log("no payload");

    return {
      statusCode: 400,
      body: "No payload",
    };
  }

  const headers = HeadersSchema.safeParse(event.headers);

  if (!headers.success) {
    console.log("invalid headers");

    return {
      statusCode: 400,
      body: "Invalid headers",
    };
  }

  const secret = Resource.SupabaseWebhookSecret.value;

  const base64Secret = secret.split(",")[1].split("_")[1];

  const wh = new Webhook(base64Secret);

  try {
    const unknownData = wh.verify(payload, headers.data);

    const parsedData = BodySchema.safeParse(unknownData);

    if (!parsedData.success) {
      console.log("invalid payload");

      console.log(parsedData.error);

      return {
        statusCode: 400,
        body: "Invalid payload",
      };
    }

    const { user_id, claims } = parsedData.data;

    let user = await userRepo.getById(user_id);

    if (!user) {
      console.log("creating user for first time");
      // the first time a user logs in, we create them in the database.
      // we set the active workspace id to null, because they will only
      // have access to the default personal workspace.
      user = await userRepo.create({
        id: user_id,
        email: claims.email,
        activeWorkspaceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`created user ${user_id}`);
    }

    console.log(`user ${user_id} logged in`);

    return {
      body: JSON.stringify({
        claims: {
          ...claims,
          active_workspace_id: user.activeWorkspaceId,
        },
      }),
      statusCode: 200,
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: "Internal server error",
    };
  }
}

const HeadersSchema = z.object({
  "webhook-id": z.string(),
  "webhook-timestamp": z.string(),
  "webhook-signature": z.string(),
});

// Define the authentication method enum
const AuthenticationMethod = z.enum([
  "oauth",
  "password",
  "otp",
  "totp",
  "recovery",
  "invite",
  "sso/saml",
  "magiclink",
  "email/signup",
  "email_change",
  "token_refresh",
  "anonymous",
]);

// Define the AMR (Authentication Methods References) schema
const AMREntry = z.object({
  method: AuthenticationMethod,
  timestamp: z.number(),
});

// Define the claims schema
const Claims = z.object({
  aud: z.union([z.array(z.string()), z.string()]),
  exp: z.number(),
  iat: z.number(),
  sub: z.string(),
  email: z.string(),
  phone: z.string(),
  app_metadata: z.object({}),
  user_metadata: z.object({}),
  role: z.enum(["anon", "authenticated"]),
  aal: z.enum(["aal1", "aal2", "aal3"]),
  amr: z.array(AMREntry),
  session_id: z.string(),
  is_anonymous: z.boolean(),
});

// Define the root schema
const BodySchema = z.object({
  user_id: z.string(),
  claims: Claims,
  authentication_method: AuthenticationMethod,
});
