CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bean_origins" (
	"id" text PRIMARY KEY NOT NULL,
	"bean_id" text NOT NULL,
	"origin_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bean_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"from_bean_id" text NOT NULL,
	"to_bean_id" text NOT NULL,
	"kind" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bean_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"bean_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"title" text NOT NULL,
	"take" text NOT NULL,
	"tradeoff" text NOT NULL,
	"boundary" text NOT NULL,
	"uncertainty" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"origins_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_document" text NOT NULL,
	"payload_digest" text NOT NULL,
	"attestation_kind" text DEFAULT 'agent_attested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beans" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"current_revision_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutation_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"operation_key" text NOT NULL,
	"action" text NOT NULL,
	"request_digest" text NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_auth_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"grant_id" text NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"resource" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text DEFAULT 'S256' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"registration_kind" text NOT NULL,
	"redirect_uris" jsonb NOT NULL,
	"metadata_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"resource" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"token_type" text NOT NULL,
	"grant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"resource" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "origins" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"normalized_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shelf_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_user_id" text,
	"target_bean_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text DEFAULT 'u_' || substr(md5(random()::text), 1, 10) NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_origins" ADD CONSTRAINT "bean_origins_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_origins" ADD CONSTRAINT "bean_origins_origin_id_origins_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."origins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_relations" ADD CONSTRAINT "bean_relations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_relations" ADD CONSTRAINT "bean_relations_from_bean_id_beans_id_fk" FOREIGN KEY ("from_bean_id") REFERENCES "public"."beans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_relations" ADD CONSTRAINT "bean_relations_to_bean_id_beans_id_fk" FOREIGN KEY ("to_bean_id") REFERENCES "public"."beans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bean_revisions" ADD CONSTRAINT "bean_revisions_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_receipts" ADD CONSTRAINT "mutation_receipts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_auth_codes" ADD CONSTRAINT "oauth_auth_codes_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_target_bean_id_beans_id_fk" FOREIGN KEY ("target_bean_id") REFERENCES "public"."beans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "bean_origins_origin_idx" ON "bean_origins" USING btree ("origin_id");--> statement-breakpoint
CREATE INDEX "bean_origins_bean_idx" ON "bean_origins" USING btree ("bean_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_relations_unique_idx" ON "bean_relations" USING btree ("from_bean_id","to_bean_id","kind");--> statement-breakpoint
CREATE INDEX "bean_relations_owner_idx" ON "bean_relations" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_revisions_bean_rev_idx" ON "bean_revisions" USING btree ("bean_id","revision_number");--> statement-breakpoint
CREATE INDEX "beans_owner_visibility_idx" ON "beans" USING btree ("owner_id","visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "mutation_receipts_owner_op_idx" ON "mutation_receipts" USING btree ("owner_id","operation_key");--> statement-breakpoint
CREATE INDEX "oauth_grants_user_idx" ON "oauth_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_grant_idx" ON "oauth_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "origins_normalized_url_idx" ON "origins" USING btree ("normalized_url");--> statement-breakpoint
CREATE INDEX "shelf_items_user_idx" ON "shelf_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bean_revisions_fts_idx" ON "bean_revisions" USING gin (to_tsvector('simple', "search_document"));
