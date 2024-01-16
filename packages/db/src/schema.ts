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

export const clientSecrets = mysqlTable(
  "client_secrets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    clientId: varchar("client_id", { length: 100 }).notNull(),
    secret: varchar("secret", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["active", "revoked"]).notNull(),
    expiresAt: datetime("expires_at", { fsp: 3, mode: "date" }),
    createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
  },
  (table) => {
    return {
      clientIdIdx: index("client_id_idx").on(table.clientId),
    };
  }
);

export const workspaces = mysqlTable(
  "workspaces",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
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

export const apis = mysqlTable(
  "apis",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    signingSecretId: varchar("signing_secret_id", { length: 36 }).notNull(),
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
  createdAt: datetime("created_at", { fsp: 3, mode: "date" }).notNull(),
  updatedAt: datetime("updated_at", { fsp: 3, mode: "date" }).notNull(),
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

export const clientSecretsRelations = relations(clientSecrets, ({ one }) => {
  return {
    client: one(clients, {
      fields: [clientSecrets.clientId],
      references: [clients.id],
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
    signingSecret: one(signingSecrets, {
      fields: [apis.signingSecretId],
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
