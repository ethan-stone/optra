import { relations } from "drizzle-orm";
import {
  sqliteTable,
  index,
  text,
  integer,
  unique,
} from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const clients = sqliteTable(
  "clients",
  {
    id: text("id", { length: 100 }).primaryKey(),
    name: text("name", { length: 255 }).notNull(),
    version: integer("version").notNull(),
    clientIdPrefix: text("client_id_prefix", { length: 36 }), // will be applied to client id
    clientSecretPrefix: text("client_secret_prefix", { length: 36 }), // will be applied to client id
    workspaceId: text("workspace_id", { length: 36 }).notNull(),
    forWorkspaceId: text("for_workspace_id", { length: 36 }),
    apiId: text("api_id", { length: 36 }).notNull(),
    currentClientSecretId: text("current_client_secret_id", {
      length: 36,
    }).notNull(),
    nextClientSecretId: text("next_client_secret_id", { length: 36 }),
    rateLimitBucketSize: integer("rate_limit_bucket_size"),
    rateLimitRefillAmount: integer("rate_limit_refill_amount"),
    rateLimitRefillInterval: integer("rate_limit_refill_interval"), // in milliseconds
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("clients_workspace_id_idx").on(table.workspaceId),
      forWorkspaceIdIdx: index("for_workspace_id_idx").on(table.forWorkspaceId),
    };
  }
);

export const clientSecrets = sqliteTable("client_secrets", {
  id: text("id", { length: 36 }).primaryKey(),
  secret: text("secret", { length: 255 }).notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

/**
 * Describes a pricing element for a subscription.
 * The cents describes the price in cents per unit. null means free.
 * The maxUnits and minUnits describe the min and max number of units that can be billed at the given centsPerUnit. null for maxUnits means unlimited.
 * For example, if minUnits is 1, maxUnits is 10, and centsPerUnit is null, then the first 10 units are free.
 * If the next pricing element is minUnits 11, maxUnits 20, and centsPerUnit 90, then the price is $0.90 for the next 10 units.
 * If the next pricing element is minUnits 21, maxUnits null, and centsPerUnit 80, then the price is $0.80 for each additional unit.
 */
export const SubscriptionPricing = z.object({
  minUnits: z.number(),
  maxUnits: z.number().nullable(),
  centsPerUnit: z.string().nullable(),
});

export const Subscriptions = z
  .object({
    plan: z.object({
      tier: z.literal("pro"),
      productId: z.string(),
      cents: z.string(),
    }),
    tokens: z.object({
      productId: z.string(),
      pricing: z.array(SubscriptionPricing),
    }),
    verifications: z.object({
      productId: z.string(),
      pricing: z.array(SubscriptionPricing),
    }),
  })
  .nullable();

export type SubscriptionPricing = z.infer<typeof SubscriptionPricing>;

export type Subscriptions = z.infer<typeof Subscriptions>;

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id", { length: 36 }).primaryKey(),
    name: text("name", { length: 255 }).notNull(),
    tenantId: text("tenant_id", { length: 36 }).notNull(),
    dataEncryptionKeyId: text("data_encryption_key_id", {
      length: 36,
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: unique("tenant_id_idx").on(table.tenantId),
      dataEncryptionKeyIdIdx: index("data_encryption_key_id_idx").on(
        table.dataEncryptionKeyId
      ),
    };
  }
);

// separate table for billing to decouple billing from the rest of the workspace
// otherwise it would be very difficult to test and bootstrap
export const workspaceBillingInfo = sqliteTable("workspace_billing_info", {
  id: text("id", { length: 36 }).primaryKey(),
  workspaceId: text("workspace_id", { length: 36 }).notNull(),
  plan: text("plan", { enum: ["free", "pro", "enterprise"] }).notNull(),
  customerId: text("customer_id", { length: 36 }).notNull(),
  subscriptions: text("subscription", { mode: "json" }).$type<Subscriptions>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const apis = sqliteTable(
  "apis",
  {
    id: text("id", { length: 36 }).primaryKey(),
    name: text("name", { length: 255 }).notNull(),
    workspaceId: text("workspace_id", { length: 36 }).notNull(),
    tokenExpirationInSeconds: integer("token_expiration_in_seconds").notNull(), // in seconds
    currentSigningSecretId: text("current_signing_secret_id", {
      length: 36,
    }).notNull(),
    nextSigningSecretId: text("next_signing_secret_id", {
      length: 36,
    }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("apis_workspace_id_idx").on(table.workspaceId),
    };
  }
);

export const signingSecrets = sqliteTable("signing_secrets", {
  id: text("id", { length: 36 }).primaryKey(),
  secret: text("secret", { length: 8192 }).notNull(), // base64 encoded encrypted signing secret
  iv: text("iv", { length: 1024 }).notNull(), // base64 encoded initialization vector NOT encrypted. Doesn't need to be.
  algorithm: text("algorithm", { enum: ["rsa256", "hsa256"] }).notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const apiScopes = sqliteTable(
  "api_scopes",
  {
    id: text("id", { length: 36 }).primaryKey(),
    apiId: text("api_id", { length: 36 }).notNull(),
    name: text("name", { length: 255 }).notNull(),
    description: text("description", { length: 1024 }).default("").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => {
    return {
      apiIdIdx: index("api_id_idx").on(table.apiId),
      apiIdNameIdx: unique("api_id_name_idx").on(table.apiId, table.name),
    };
  }
);

export const clientScopes = sqliteTable(
  "client_scopes",
  {
    id: text("id", { length: 36 }).primaryKey(),
    clientId: text("client_id", { length: 36 }).notNull(),
    apiScopeId: text("api_scope_id", { length: 36 }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => {
    return {
      clientIdIdx: index("client_id_idx").on(table.clientId),
      apiScopeIdIdx: index("api_scope_id_idx").on(table.apiScopeId),
    };
  }
);

export const dataEncryptionKeys = sqliteTable("data_encryption_keys", {
  id: text("id", { length: 36 }).primaryKey(),
  key: text("key", { length: 1024 }).notNull(), // base64 encoded encrypted data key
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const clientRelations = relations(clients, ({ one, many }) => {
  return {
    secrets: many(clientSecrets),
    currentClientSecret: one(clientSecrets, {
      relationName: "current_client_secret_relation",
      fields: [clients.currentClientSecretId],
      references: [clientSecrets.id],
    }),
    nextClientSecret: one(clientSecrets, {
      relationName: "next_client_secret_relation",
      fields: [clients.nextClientSecretId],
      references: [clientSecrets.id],
    }),
    scopes: many(clientScopes),
    workspace: one(workspaces, {
      relationName: "workspace_client_relation",
      fields: [clients.workspaceId],
      references: [workspaces.id],
    }),
    forWorkspace: one(workspaces, {
      relationName: "for_workspace_client_relation",
      fields: [clients.forWorkspaceId],
      references: [workspaces.id],
    }),
    api: one(apis, {
      relationName: "api_client_relation",
      fields: [clients.apiId],
      references: [apis.id],
    }),
  };
});

export const workspacesRelations = relations(workspaces, ({ many, one }) => {
  return {
    clients: many(clients, {
      relationName: "workspace_client_relation",
    }),
    apis: many(apis),
    dataEncryptionKey: one(dataEncryptionKeys, {
      fields: [workspaces.dataEncryptionKeyId],
      references: [dataEncryptionKeys.id],
    }),
    billingInfo: one(workspaceBillingInfo, {
      fields: [workspaces.id],
      references: [workspaceBillingInfo.workspaceId],
    }),
  };
});

export const apisRelations = relations(apis, ({ one, many }) => {
  return {
    workspace: one(workspaces, {
      relationName: "workspace_api_relation",
      fields: [apis.workspaceId],
      references: [workspaces.id],
    }),
    scopes: many(apiScopes),
    clients: many(clients),
    currentSigningSecret: one(signingSecrets, {
      fields: [apis.currentSigningSecretId],
      references: [signingSecrets.id],
    }),
    nextSigningSecret: one(signingSecrets, {
      fields: [apis.nextSigningSecretId],
      references: [signingSecrets.id],
    }),
  };
});

export const apiScopesRelations = relations(apiScopes, ({ one, many }) => {
  return {
    api: one(apis, {
      relationName: "api_scope_relation",
      fields: [apiScopes.apiId],
      references: [apis.id],
    }),
    clients: many(clientScopes),
  };
});

export const clientScopesRelations = relations(clientScopes, ({ one }) => {
  return {
    client: one(clients, {
      relationName: "client_client_scope_relation",
      fields: [clientScopes.clientId],
      references: [clients.id],
    }),
    apiScope: one(apiScopes, {
      relationName: "api_scope_client_scope_relation",
      fields: [clientScopes.apiScopeId],
      references: [apiScopes.id],
    }),
  };
});
