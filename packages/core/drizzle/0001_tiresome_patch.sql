ALTER TABLE "users" ALTER COLUMN "handle" SET DEFAULT 'u_' || substr(md5(random()::text), 1, 10);--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bean_relations_to_bean_idx" ON "bean_relations" USING btree ("to_bean_id","kind");--> statement-breakpoint
CREATE INDEX "beans_visibility_updated_idx" ON "beans" USING btree ("visibility","updated_at");--> statement-breakpoint
CREATE INDEX "beans_owner_updated_idx" ON "beans" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "oauth_grants_user_active_idx" ON "oauth_grants" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shelf_items_user_target_bean_idx" ON "shelf_items" USING btree ("user_id","target_bean_id");--> statement-breakpoint
CREATE INDEX "shelf_items_user_target_user_idx" ON "shelf_items" USING btree ("user_id","target_user_id");