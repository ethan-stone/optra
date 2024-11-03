import { relations } from "drizzle-orm";
import {
  pgTable,
  index,
  integer,
  unique,
  json,
  timestamp,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    version: integer("version").notNull(),
    clientIdPrefix: text("client_id_prefix"), // will be applied to client id
    clientSecretPrefix: text("client_secret_prefix"), // will be applied to client id
    workspaceId: text("workspace_id").notNull(),
    forWorkspaceId: text("for_workspace_id"),
    apiId: text("api_id").notNull(),
    currentClientSecretId: text("current_client_secret_id").notNull(),
    nextClientSecretId: text("next_client_secret_id"),
    rateLimitBucketSize: integer("rate_limit_bucket_size"),
    rateLimitRefillAmount: integer("rate_limit_refill_amount"),
    rateLimitRefillInterval: integer("rate_limit_refill_interval"), // in milliseconds
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("clients_workspace_id_idx").on(table.workspaceId),
      forWorkspaceIdIdx: index("clients_for_workspace_id_idx").on(
        table.forWorkspaceId
      ),
    };
  }
);

export const clientSecrets = pgTable("client_secrets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  secret: text("secret").notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
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

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    tenantId: text("tenant_id").notNull(),
    type: text("type", { enum: ["free", "paid"] }).notNull(),
    dataEncryptionKeyId: text("data_encryption_key_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => {
    return {
      tenantIdIdx: unique("workspaces_tenant_id_idx").on(table.tenantId),
      dataEncryptionKeyIdIdx: index("workspaces_data_encryption_key_id_idx").on(
        table.dataEncryptionKeyId
      ),
    };
  }
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => {
    return {
      workspaceIdUserIdIdx: index(
        "workspace_members_workspace_id_user_id_idx"
      ).on(table.workspaceId, table.userId),
      userIdIdx: index("workspace_members_user_id_idx").on(table.userId),
    };
  }
);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  activeWorkspaceId: text("active_workspace_id"), // this is the current workspace the user is logged into.
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

// separate table for billing to decouple billing from the rest of the workspace
// otherwise it would be very difficult to test and bootstrap
export const workspaceBillingInfo = pgTable("workspace_billing_info", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  plan: text("plan", { enum: ["free", "pro", "enterprise"] }).notNull(),
  customerId: text("customer_id").notNull(),
  subscriptions: json("subscription").$type<Subscriptions>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const apis = pgTable(
  "apis",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    workspaceId: text("workspace_id").notNull(),
    tokenExpirationInSeconds: integer("token_expiration_in_seconds").notNull(), // in seconds
    currentSigningSecretId: text("current_signing_secret_id").notNull(),
    nextSigningSecretId: text("next_signing_secret_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("apis_workspace_id_idx").on(table.workspaceId),
    };
  }
);

export const signingSecrets = pgTable("signing_secrets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  secret: text("secret").notNull(), // base64 encoded encrypted signing secret
  iv: text("iv").notNull(), // base64 encoded initialization vector NOT encrypted. Doesn't need to be.
  algorithm: text("algorithm", { enum: ["rsa256", "hsa256"] }).notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const apiScopes = pgTable(
  "api_scopes",
  {
    id: text("id").primaryKey(),
    apiId: text("api_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => {
    return {
      apiIdIdx: index("api_scopes_api_id_idx").on(table.apiId),
      apiIdNameIdx: unique("api_scopes_api_id_name_idx").on(
        table.apiId,
        table.name
      ),
    };
  }
);

export const clientScopes = pgTable(
  "client_scopes",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    apiScopeId: text("api_scope_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (table) => {
    return {
      clientIdIdx: index("client_scopes_client_id_idx").on(table.clientId),
      apiScopeIdIdx: index("client_scopes_api_scope_id_idx").on(
        table.apiScopeId
      ),
    };
  }
);

export const dataEncryptionKeys = pgTable("data_encryption_keys", {
  id: text("id").primaryKey(),
  key: text("key").notNull(), // base64 encoded encrypted data key
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
});

export const tokenGenerations = pgTable(
  "token_generations",
  {
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    apiId: varchar("api_id", { length: 36 }).notNull(),
    clientId: varchar("client_id", { length: 36 }).notNull(),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull(),
  },
  (table) => {
    return {
      workspaceIdIdx: index("token_generations_workspace_id_idx").on(
        table.workspaceId
      ),
      apiIdIdx: index("token_generations_api_id_idx").on(table.apiId),
      clientIdIdx: index("token_generations_client_id_idx").on(table.clientId),
      timestampIdx: index("token_generations_timestamp_idx").on(
        table.timestamp
      ),
    };
  }
);

export const tokenVerifications = pgTable(
  "token_verifications",
  {
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    apiId: varchar("api_id", { length: 36 }).notNull(),
    clientId: varchar("client_id", { length: 36 }).notNull(),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull(),
    deniedReason: varchar("denied_reason", { length: 255 }),
  },
  (table) => {
    return {
      workspaceIdIdx: index("token_verifications_workspace_id_idx").on(
        table.workspaceId
      ),
      apiIdIdx: index("token_verifications_api_id_idx").on(table.apiId),
      clientIdIdx: index("token_verifications_client_id_idx").on(
        table.clientId
      ),
      timestampIdx: index("token_verifications_timestamp_idx").on(
        table.timestamp
      ),
    };
  }
);

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
    members: many(workspaceMembers),
  };
});

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => {
    return {
      workspace: one(workspaces, {
        relationName: "workspace_member_relation",
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id],
      }),
      user: one(users, {
        relationName: "user_member_relation",
        fields: [workspaceMembers.userId],
        references: [users.id],
      }),
    };
  }
);

export const usersRelations = relations(users, ({ many }) => {
  return {
    memberships: many(workspaceMembers),
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
    tokenGenerations: many(tokenGenerations),
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
