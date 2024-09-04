CREATE TABLE IF NOT EXISTS "token_verifications" (
	"workspace_id" varchar(36) NOT NULL,
	"api_id" varchar(36) NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"denied_reason" varchar(255)
);
--> statement-breakpoint
DROP INDEX IF EXISTS "workspace_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_verifications_workspace_id_idx" ON "token_verifications" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_verifications_api_id_idx" ON "token_verifications" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_verifications_client_id_idx" ON "token_verifications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_verifications_timestamp_idx" ON "token_verifications" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_workspace_id_idx" ON "token_generations" USING btree ("workspace_id");