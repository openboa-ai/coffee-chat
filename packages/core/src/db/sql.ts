export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE DEFAULT ('u_' || substr(md5(random()::text), 1, 10)),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_idx ON accounts(provider_id, account_id);

CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS origins (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  normalized_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS origins_normalized_url_idx ON origins(normalized_url);

CREATE TABLE IF NOT EXISTS beans (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'private',
  current_revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS beans_owner_visibility_idx ON beans(owner_id, visibility);

CREATE TABLE IF NOT EXISTS bean_revisions (
  id TEXT PRIMARY KEY,
  bean_id TEXT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  take TEXT NOT NULL,
  tradeoff TEXT NOT NULL,
  boundary TEXT NOT NULL,
  uncertainty TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  origins_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_document TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  attestation_kind TEXT NOT NULL DEFAULT 'agent_attested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS bean_revisions_bean_rev_idx ON bean_revisions(bean_id, revision_number);
CREATE INDEX IF NOT EXISTS bean_revisions_fts_idx ON bean_revisions USING GIN (to_tsvector('simple', search_document));

CREATE TABLE IF NOT EXISTS bean_origins (
  id TEXT PRIMARY KEY,
  bean_id TEXT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  origin_id TEXT NOT NULL REFERENCES origins(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS bean_origins_origin_idx ON bean_origins(origin_id);
CREATE INDEX IF NOT EXISTS bean_origins_bean_idx ON bean_origins(bean_id);

CREATE TABLE IF NOT EXISTS bean_relations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_bean_id TEXT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  to_bean_id TEXT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS bean_relations_unique_idx ON bean_relations(from_bean_id, to_bean_id, kind);
CREATE INDEX IF NOT EXISTS bean_relations_owner_idx ON bean_relations(owner_id);

CREATE TABLE IF NOT EXISTS shelf_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  target_bean_id TEXT REFERENCES beans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shelf_items_user_idx ON shelf_items(user_id);

CREATE TABLE IF NOT EXISTS mutation_receipts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_key TEXT NOT NULL,
  action TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS mutation_receipts_owner_op_idx ON mutation_receipts(owner_id, operation_key);

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  registration_kind TEXT NOT NULL,
  redirect_uris JSONB NOT NULL,
  metadata_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  scopes JSONB NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS oauth_grants_user_idx ON oauth_grants(user_id);

CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  code_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  resource TEXT NOT NULL,
  scopes JSONB NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  token_type TEXT NOT NULL,
  grant_id TEXT NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  scopes JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS oauth_tokens_grant_idx ON oauth_tokens(grant_id);
`;
