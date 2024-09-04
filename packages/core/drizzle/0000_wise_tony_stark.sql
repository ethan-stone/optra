CREATE TABLE IF NOT EXISTS "api_scopes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"api_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1024) DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "api_id_name_idx" UNIQUE("api_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "apis" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"token_expiration_in_seconds" integer NOT NULL,
	"current_signing_secret_id" varchar(36) NOT NULL,
	"next_signing_secret_id" varchar(36),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_scopes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"api_scope_id" varchar(36) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_secrets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"secret" varchar(255) NOT NULL,
	"status" varchar NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer NOT NULL,
	"client_id_prefix" varchar(36),
	"client_secret_prefix" varchar(36),
	"workspace_id" varchar(36) NOT NULL,
	"for_workspace_id" varchar(36),
	"api_id" varchar(36) NOT NULL,
	"current_client_secret_id" varchar(36) NOT NULL,
	"next_client_secret_id" varchar(36),
	"rate_limit_bucket_size" integer,
	"rate_limit_refill_amount" integer,
	"rate_limit_refill_interval" integer,
	"metadata" json,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_encryption_keys" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" varchar(1024) NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signing_secrets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"secret" varchar(8192) NOT NULL,
	"iv" varchar(1024) NOT NULL,
	"algorithm" varchar NOT NULL,
	"status" varchar NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_billing_info" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"plan" varchar NOT NULL,
	"customer_id" varchar(36) NOT NULL,
	"subscription" json,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"data_encryption_key_id" varchar(36) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "tenant_id_idx" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_id_idx" ON "api_scopes" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apis_workspace_id_idx" ON "apis" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_id_idx" ON "client_scopes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_scope_id_idx" ON "client_scopes" USING btree ("api_scope_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_workspace_id_idx" ON "clients" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "for_workspace_id_idx" ON "clients" USING btree ("for_workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_encryption_key_id_idx" ON "workspaces" USING btree ("data_encryption_key_id");