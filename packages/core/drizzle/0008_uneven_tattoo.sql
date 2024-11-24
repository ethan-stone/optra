ALTER TABLE "apis" ADD COLUMN "algorithm" text NOT NULL;--> statement-breakpoint
ALTER TABLE "apis" ADD COLUMN "urls" json NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_billing_info" ADD COLUMN "requested_plan_change_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_billing_info" ADD COLUMN "requested_plan_change_to" text;--> statement-breakpoint
ALTER TABLE "workspace_billing_info" ADD COLUMN "plan_changed_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_workspace_id_user_id_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "workspace_billing_info" ADD CONSTRAINT "workspace_billing_info_workspace_id_unique" UNIQUE("workspace_id");