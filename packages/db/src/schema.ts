import { relations } from "drizzle-orm";
import {
  mysqlEnum,
  mysqlTable,
  index,
  varchar,
  int,
  datetime,
  json,
  unique,
} from "drizzle-orm/mysql-core";
import { z } from "zod";

export const clients = mysqlTable(
  "clients",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    version: int("version").notNull(),
    prefix: varchar("prefix", { length: 36 }), // will be applied to client id and secrets
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    forWorkspaceId: varchar("for_workspace_id", { length: 36 }),
    apiId: varchar("api_id", { length: 36 }).notNull(),
    currentClientSecretId: varchar("current_client_secret_id", {
      length: 36,
    }).notNull(),
    nextClientSecretId: varchar("next_client_secret_id", { length: 36 }),
    rateLimitBucketSize: int("rate_limit_bucket_size"),
    rateLimitRefillAmount: int("rate_limit_refill_amount"),
    rateLimitRefillInterval: int("rate_limit_refill_interval"), // in milliseconds
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
    deletedAt: datetime("deleted_at", { fsp: 3, mode: "date" }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("workspace_id_idx").on(table.workspaceId),
      forWorkspaceIdIdx: index("for_workspace_id_idx").on(table.forWorkspaceId),
    };
  }
);

export const clientSecrets = mysqlTable("client_secrets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  secret: varchar("secret", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).notNull(),
  expiresAt: datetime("expires_at", { fsp: 3, mode: "date" }),
  createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
  deletedAt: datetime("deleted_at", { fsp: 3, mode: "date" }),
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

export const workspaces = mysqlTable(
  "workspaces",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    dataEncryptionKeyId: varchar("data_encryption_key_id", {
      length: 36,
    }).notNull(),
    createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
  },
  (table) => {
    return {
      dataEncryptionKeyIdIdx: index("data_encryption_key_id_idx").on(
        table.dataEncryptionKeyId
      ),
    };
  }
);

// separate table for billing to decouple billing from the rest of the workspace
// otherwise it would be very difficult to test and bootstrap
export const workspaceBillingInfo = mysqlTable("workspace_billing_info", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).notNull(),
  customerId: varchar("customer_id", { length: 36 }).notNull(),
  subscriptions: json("subscription").$type<Subscriptions>(),
  createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
  updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
});

export const apis = mysqlTable(
  "apis",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    currentSigningSecretId: varchar("current_signing_secret_id", {
      length: 36,
    }).notNull(),
    nextSigningSecretId: varchar("next_signing_secret_id", {
      length: 36,
    }),
    createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
    deletedAt: datetime("deleted_at", { fsp: 3, mode: "date" }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("workspace_id_idx").on(table.workspaceId),
      workspaceApiNameIdx: unique("workspace_id_name_idx").on(
        table.workspaceId,
        table.name
      ),
    };
  }
);

export const signingSecrets = mysqlTable("signing_secrets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  secret: varchar("secret", { length: 8192 }).notNull(), // base64 encoded encrypted signing secret
  iv: varchar("iv", { length: 1024 }).notNull(), // base64 encoded initialization vector NOT encrypted. Doesn't need to be.
  algorithm: mysqlEnum("algorithm", ["rsa256", "hsa256"]).notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).notNull(),
  expiresAt: datetime("expires_at", { fsp: 3, mode: "date" }),
  createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
  updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
  deletedAt: datetime("deleted_at", { fsp: 3, mode: "date" }),
});

export const apiScopes = mysqlTable(
  "api_scopes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    apiId: varchar("api_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 1024 }).default(""),
    createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
  },
  (table) => {
    return {
      apiIdIdx: index("api_id_idx").on(table.apiId),
      apiIdNameIdx: unique("api_id_name_idx").on(table.apiId, table.name),
    };
  }
);

export const clientScopes = mysqlTable(
  "client_scopes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    clientId: varchar("client_id", { length: 36 }).notNull(),
    apiScopeId: varchar("api_scope_id", { length: 36 }).notNull(),
    createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
  },
  (table) => {
    return {
      clientIdIdx: index("client_id_idx").on(table.clientId),
      apiScopeIdIdx: index("api_scope_id_idx").on(table.apiScopeId),
    };
  }
);

export const dataEncryptionKeys = mysqlTable("data_encryption_keys", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 1024 }).notNull(), // base64 encoded encrypted data key
  createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
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
