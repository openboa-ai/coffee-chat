import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { NormalizedOrigin } from "../types.js";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  handle: text("handle")
    .notNull()
    .unique()
    .default(sql`'u_' || substr(md5(random()::text), 1, 10)`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const origins = pgTable(
  "origins",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(), // 'source_excerpt' | 'work_episode'
    normalizedUrl: text("normalized_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("origins_normalized_url_idx").on(table.normalizedUrl),
  ],
);

export const beans = pgTable(
  "beans",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visibility: text("visibility").notNull().default("private"), // 'private' | 'public'
    currentRevisionId: text("current_revision_id"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("beans_owner_visibility_idx").on(table.ownerId, table.visibility),
  ],
);

export const beanRevisions = pgTable(
  "bean_revisions",
  {
    id: text("id").primaryKey(),
    beanId: text("bean_id")
      .notNull()
      .references(() => beans.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    title: text("title").notNull(),
    take: text("take").notNull(),
    tradeoff: text("tradeoff").notNull(),
    boundary: text("boundary").notNull(),
    uncertainty: text("uncertainty"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    originsJson: jsonb("origins_json")
      .$type<NormalizedOrigin[]>()
      .notNull()
      .default([]),
    searchDocument: text("search_document").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    attestationKind: text("attestation_kind")
      .notNull()
      .default("agent_attested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("bean_revisions_bean_rev_idx").on(
      table.beanId,
      table.revisionNumber,
    ),
  ],
);

export const beanOrigins = pgTable(
  "bean_origins",
  {
    id: text("id").primaryKey(),
    beanId: text("bean_id")
      .notNull()
      .references(() => beans.id, { onDelete: "cascade" }),
    originId: text("origin_id")
      .notNull()
      .references(() => origins.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    index("bean_origins_origin_idx").on(table.originId),
    index("bean_origins_bean_idx").on(table.beanId),
  ],
);

export const beanRelations = pgTable(
  "bean_relations",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromBeanId: text("from_bean_id")
      .notNull()
      .references(() => beans.id, { onDelete: "cascade" }),
    toBeanId: text("to_bean_id")
      .notNull()
      .references(() => beans.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'supersedes' | 'refines' | 'tensions_with'
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("bean_relations_unique_idx").on(
      table.fromBeanId,
      table.toBeanId,
      table.kind,
    ),
    index("bean_relations_owner_idx").on(table.ownerId),
  ],
);

export const shelfItems = pgTable(
  "shelf_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // 'person' | 'bean'
    targetUserId: text("target_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    targetBeanId: text("target_bean_id").references(() => beans.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shelf_items_user_idx").on(table.userId)],
);

export const mutationReceipts = pgTable(
  "mutation_receipts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    operationKey: text("operation_key").notNull(),
    action: text("action").notNull(), // 'save_bean' | 'set_bean_visibility' | 'delete_bean'
    requestDigest: text("request_digest").notNull(),
    resultJson: jsonb("result_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mutation_receipts_owner_op_idx").on(
      table.ownerId,
      table.operationKey,
    ),
  ],
);

// --- OAuth 2.1 MCP Authorization Server Tables ---

export const oauthClients = pgTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  clientName: text("client_name").notNull(),
  registrationKind: text("registration_kind").notNull(), // 'dcr' | 'cimd' | 'static'
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  metadataUrl: text("metadata_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthGrants = pgTable(
  "oauth_grants",
  {
    id: text("id").primaryKey(), // stable grant referenceId, never reactivated once revoked
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_grants_user_idx").on(table.userId)],
);

export const oauthAuthCodes = pgTable("oauth_auth_codes", {
  codeHash: text("code_hash").primaryKey(),
  grantId: text("grant_id")
    .notNull()
    .references(() => oauthGrants.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull(),
  userId: text("user_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  resource: text("resource").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: text("code_challenge_method").notNull().default("S256"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    tokenType: text("token_type").notNull(), // 'access' | 'refresh'
    grantId: text("grant_id")
      .notNull()
      .references(() => oauthGrants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    resource: text("resource").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_tokens_grant_idx").on(table.grantId)],
);
