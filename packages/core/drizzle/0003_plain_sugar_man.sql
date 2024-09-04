ALTER TABLE "api_scopes" DROP CONSTRAINT "api_id_name_idx";--> statement-breakpoint
ALTER TABLE "workspaces" DROP CONSTRAINT "tenant_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "api_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "client_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "api_scope_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "for_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "data_encryption_key_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_scopes_api_id_idx" ON "api_scopes" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_scopes_client_id_idx" ON "client_scopes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_scopes_api_scope_id_idx" ON "client_scopes" USING btree ("api_scope_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_for_workspace_id_idx" ON "clients" USING btree ("for_workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_id_idx" ON "token_generations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_api_id_idx" ON "token_generations" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_client_id_idx" ON "token_generations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_timestamp_idx" ON "token_generations" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_data_encryption_key_id_idx" ON "workspaces" USING btree ("data_encryption_key_id");--> statement-breakpoint
ALTER TABLE "api_scopes" ADD CONSTRAINT "api_scopes_api_id_name_idx" UNIQUE("api_id","name");--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_tenant_id_idx" UNIQUE("tenant_id");