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

export const InvoiceWorkspaceEvent = z.object({
  eventType: z.literal("workspace.invoice"),
  payload: z.object({
    workspaceId: z.string(),
    year: z.number(),
    month: z.number(),
  }),
  timestamp: z.number(),
});

export type InvoiceWorkspaceEvent = z.infer<typeof InvoiceWorkspaceEvent>;

export const ChangePlanEvent = z.object({
  eventType: z.literal("workspace.change_plan"),
  payload: z.object({
    workspaceId: z.string(),
  }),
  timestamp: z.number(),
});

export type ChangePlanEvent = z.infer<typeof ChangePlanEvent>;

export const EventSchemas = z.discriminatedUnion("eventType", [
  ApiSigningSecretExpiredScheduledEvent,
  ClientSecretExpiredScheduledEvent,
  InvoiceWorkspaceEvent,
  ChangePlanEvent,
]);

export type EventSchemas = z.infer<typeof EventSchemas>;
