import { z } from "zod";

export const ApiSigningSecretExpiredScheduledEvent = z.object({
  eventType: z.literal("api.signing_secret.expired"),
  payload: z.object({
    apiId: z.string(),
    signingSecretId: z.string(),
  }),
  timestamp: z.number(),
});

export type ApiSigningSecretExpiredScheduledEvent = z.infer<
  typeof ApiSigningSecretExpiredScheduledEvent
>;

export const ClientSecretExpiredScheduledEvent = z.object({
  eventType: z.literal("client.secret.expired"),
  payload: z.object({
    clientId: z.string(),
    clientSecretId: z.string(),
  }),
  timestamp: z.number(),
});

export type ClientSecretExpiredScheduledEvent = z.infer<
  typeof ClientSecretExpiredScheduledEvent
>;

export const EventSchemas = z.discriminatedUnion("eventType", [
  ApiSigningSecretExpiredScheduledEvent,
  ClientSecretExpiredScheduledEvent,
]);

export type EventSchemas = z.infer<typeof EventSchemas>;
