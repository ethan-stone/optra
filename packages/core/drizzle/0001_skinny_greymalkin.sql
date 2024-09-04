CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_generations" (
	"client_id" varchar(36) NOT NULL,
	"api_id" varchar(36) NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
SELECT create_hypertable('token_generations', 'timestamp');
--> statement-breakpoint
DROP TRIGGER ts_insert_blocker ON token_generations;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_client_id_idx" ON "token_generations" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_api_id_idx" ON "token_generations" USING btree ("api_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_generations_workspace_id_idx" ON "token_generations" USING btree ("workspace_id");