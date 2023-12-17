import { relations } from "drizzle-orm";
import {
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  index,
  varchar,
  int,
  datetime,
} from "drizzle-orm/mysql-core";

export const clients = mysqlTable(
  "clients",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    version: int("version").notNull(),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    forWorkspaceId: varchar("for_workspace_id", { length: 36 }),
    apiId: varchar("api_id", { length: 36 }).notNull(),
    rateLimitBucketSize: int("rate_limit_bucket_size"),
    rateLimitRefillAmount: int("rate_limit_refill_amount"),
    rateLimitRefillInterval: int("rate_limit_refill_interval"),
    createdAt: datetime("created_at", { fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull(),
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
    clientId: varchar("client_id", { length: 36 }).notNull(),
    secret: varchar("secret", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["active", "revoked"]).notNull(),
    expiresAt: datetime("expires_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull(),
  },
  (table) => {
    return {
      clientIdIdx: index("client_id_idx").on(table.clientId),
    };
  }
);

export const workspaces = mysqlTable("workspaces", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: datetime("created_at", { fsp: 3 }).notNull(),
  updatedAt: datetime("updated_at", { fsp: 3 }).notNull(),
});

export const apis = mysqlTable(
  "apis",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    createdAt: datetime("created_at", { fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull(),
  },
  (table) => {
    return {
      workspaceIdIdx: index("workspace_id_idx").on(table.workspaceId),
    };
  }
);

export const apiScopes = mysqlTable(
  "api_scopes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    apiId: varchar("api_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: datetime("created_at", { fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull(),
  },
  (table) => {
    return {
      apiIdIdx: index("api_id_idx").on(table.apiId),
    };
  }
);

export const clientScopes = mysqlTable(
  "client_scopes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    clientId: varchar("client_id", { length: 36 }).notNull(),
    apiScopeId: varchar("api_scope_id", { length: 36 }).notNull(),
    createdAt: datetime("created_at", { fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull(),
  },
  (table) => {
    return {
      clientIdIdx: index("client_id_idx").on(table.clientId),
      apiScopeIdIdx: index("api_scope_id_idx").on(table.apiScopeId),
    };
  }
);

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

export const workspacesRelations = relations(workspaces, ({ many }) => {
  return {
    clients: many(clients),
    apis: many(apis),
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
