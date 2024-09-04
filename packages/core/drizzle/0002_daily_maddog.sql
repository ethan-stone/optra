CREATE TABLE IF NOT EXISTS "token_generations" (
	"workspace_id" varchar(36) NOT NULL,
	"api_id" varchar(36) NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"timestamp" timestamp NOT NULL
);
