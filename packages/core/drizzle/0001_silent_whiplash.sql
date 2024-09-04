CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);
