ALTER TABLE "api_scopes" ADD COLUMN "workspace_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "client_scopes" ADD COLUMN "workspace_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "client_secrets" ADD COLUMN "workspace_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_secrets" ADD COLUMN "workspace_id" text NOT NULL;