# Coffee Chat MVP Technical Specification

**Status:** Canonical MVP contract (2026-11-24). Governs `packages/core`, `packages/ui`, `packages/mcp-apps`, `apps/web`, `skills/`, and `evals/`.

---

## 1. Architecture & Repository Boundaries

Coffee Chat ships as a single npm workspaces monorepo with strict internal boundaries:

| Path | Owns | Must Not Own |
| --- | --- | --- |
| `packages/core` | Domain schemas, URL normalizer, RFC 8785 JCS digest, Drizzle Postgres schema (Neon + PGlite driver), Bean/Origin/Relation/Shelf/Receipt services, privacy & concurrency invariants | HTTP/Next.js framework glue, React UI, LLM calls |
| `packages/ui` | Shared `@openboa/yogurt` presentation components (`ConfirmBeanCard`, `BeanPicker`, `PerspectiveDiffCard`, `BeanView`, `Shell`) | Direct DB access, secrets |
| `packages/mcp-apps` | Self-contained HTML/JS MCP App bundles (`ui://coffee-chat/*.html`) using `@modelcontextprotocol/ext-apps` | Unbundled external script/style links |
| `apps/web` | Next.js App Router Zero-AI Web Home, Better Auth (GitHub + Google + dev/test-only local adapter), OAuth 2.1 `/api/mcp` Streamable HTTP endpoint | Server-side LLM or embedding API calls, URL crawling |
| `skills/` | Host-neutral `SKILL.md` specifications (`roast`, `brew`) and host packaging manifests | Private user data, secrets |
| `evals/` | Candidate-independent Taste evaluation harness, 6 frozen scenarios, deterministic contract checks, paired A/B smoke runner | Imports from `packages/core` internals |

---

## 2. Data Model (Postgres / Drizzle)

### 2.1 `users` & Auth
- Managed by Better Auth (`users`, `sessions`, `accounts`, `verifications`) plus public profile fields (`handle` unique lowercase slug, `display_name`).
- Login providers: **GitHub** and **Google** with `implicitLinking: false`. Authenticated users explicitly link additional providers; unlinking the last remaining login method is rejected.
- A dev/test-only local auth route/adapter is enabled **only** when `NODE_ENV !== 'production'` and `COFFEE_CHAT_ENABLE_TEST_AUTH === 'true'`, strictly disabled in production builds.

### 2.2 `origins`
- `id` (UUID), `kind` (`source_excerpt` | `work_episode`), `normalized_url` (unique nullable text for `source_excerpt`; `null` for `work_episode`), `created_at`.
- URL normalization: standard `URL` parser; lowercase scheme (`http:`/`https:` only) and host; strip default ports (`80`/`443`); reject embedded credentials (`username`/`password`); preserve path and query verbatim; strip fragment from `normalized_url` (stored in citation `locator`). Server never fetches input URLs.

### 2.3 `beans` & `bean_revisions`
- `beans`: `id` (UUID), `owner_id` (FK `users.id`), `visibility` (`private` default | `public`), `current_revision_id`, `version` (integer starting at `1`, incremented on every content revision OR visibility mutation), `created_at`, `updated_at`.
- `bean_revisions`: immutable snapshots: `id`, `bean_id`, `revision_number`, `title`, `take`, `tradeoff`, `boundary`, `uncertainty` (nullable), `tags` (`text[]`), `origins_json` (ordered array of `{originId, kind, url, sourceTitle, quotation, locator, episodeSummary}`), `search_text` (generated/maintained Postgres `tsvector` over `title`, `take`, `tradeoff`, `boundary`, `tags`), `payload_digest` (hex SHA-256), `attestation_kind` (`agent_attested` | `ui_attested`), `created_at`.

### 2.4 `bean_relations`
- `id`, `owner_id`, `from_bean_id`, `to_bean_id`, `kind` (`supersedes` | `refines` | `tensions_with`), `note` (nullable), `created_at`.
- Both endpoints must belong to `owner_id`; self-links rejected; duplicate `(from_bean_id, to_bean_id, kind)` rejected; `supersedes` cycles rejected.

### 2.5 `shelf_items`
- `id`, `user_id`, `target_type` (`person` | `bean`), `target_user_id` (nullable FK), `target_bean_id` (nullable FK), `created_at`.
- Unique per `(user_id, target_type, target_user_id, target_bean_id)`.
- Resolves live against current `visibility` (`public` only) and existence; never duplicates ownership.

### 2.6 `mutation_receipts`
- `id`, `owner_id`, `operation_key`, `action` (`save_bean` | `set_bean_visibility` | `delete_bean`), `request_digest`, `result_json`, `created_at`.
- Unique on `(owner_id, operation_key)`.
- Same `operation_key` + same `request_digest` returns the stored result idempotently.
- Same `operation_key` + different `request_digest` is rejected with `409 Conflict` (`IDEMPOTENCY_CONFLICT`).
- Deleting a Bean hard-deletes rows from `beans`, `bean_revisions`, `bean_relations`, and `shelf_items` referencing it, while retaining the content-free `mutation_receipts` row so replayed mutations never resurrect the deleted Bean.

---

## 3. Canonical Payload Digest & Optimistic Concurrency

- `prepare_bean` normalizes inputs, resolves `origins` (without inserting persistent rows), fills absent optional fields with explicit `null`, and computes:
  - Canonical object `{ schema: "coffee-chat-bean-v1", ownerId, beanId, expectedVersion, title, take, tradeoff, boundary, uncertainty, tags, visibility, origins, relations }`
  - Serialized with **RFC 8785 JCS** (deterministic UTF-16 code-unit key sorting, ECMAScript number/string formatting)
  - `digest = sha256(utf8Bytes)` (lowercase 64-hex string)
  - Fresh `operationKey` (UUID)
- `save_bean` recomputes the digest server-side from the submitted canonical fields and authenticated `ownerId`. Mismatched `digest` is rejected (`400 DIGEST_MISMATCH`).
- Creating a new Bean requires `beanId: null` and `expectedVersion: null`.
- Updating content, changing visibility, or deleting requires `expectedVersion` matching current `beans.version`; mismatch returns `409 VERSION_CONFLICT` with latest version metadata.

---

## 4. Privacy & Access Control Matrix

| Resource | Owner | Authenticated Non-Owner | Anonymous Visitor |
| --- | --- | --- | --- |
| Person Page counts (`publicCount`, `privateCount`) | Allowed | Allowed | Allowed |
| Public Bean (content, origins, public-only relations) | Allowed | Allowed | Allowed |
| Private Bean (content, origins, timestamps, ID lookup) | Allowed | `404 Not Found` | `404 Not Found` |
| Relation edge touching any Private Bean | Allowed | Filtered out (hidden) | Filtered out (hidden) |
| Historical revisions of a Public Bean | Allowed | Denied (`403`/`404`) | Denied (`404`) |
| Origin / Source Compare page | Public Beans + own Private indicator on `/me` | Public Beans only; `404` if 0 public Beans | Public Beans only; `404` if 0 public Beans |
| Mutations (`save_bean`, `set_bean_visibility`, `delete_bean`) | Owner + `beans:write` scope | Denied (`403`/`404`) | Denied (`401`) |
| `work_episode` transition to `public` | Allowed with explicit `redactionConfirmed: true` flag | Denied | Denied |

User-data routes emit `Cache-Control: private, no-store` so private transitions and deletions take effect immediately without stale CDN responses.

---

## 5. OAuth 2.1 MCP & MCP Apps Contract

### 5.1 OAuth 2.1 Discovery & Revocation
- Endpoint: `/api/mcp` (Streamable HTTP JSON-RPC).
- Unauthenticated requests return `401` with `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"`.
- Serves `/.well-known/oauth-protected-resource` (RFC 9728) and `/.well-known/oauth-authorization-server`.
- Supports Authorization Code + PKCE (`S256`), scopes `beans:read`, `beans:write`, `offline_access`, client registration via CIMD (SSRF-safe URL validation) and DCR.
- Opaque access & refresh tokens bound to a stable `grantId`. Every `/api/mcp` request verifies active token + non-revoked grant + audience/resource + required scope without cross-request caching.
- Revoking a grant sets `revokedAt` and atomically invalidates all access and refresh tokens for that grant; re-consent always creates a new `grantId` and never revives revoked tokens.

### 5.2 MCP Tools & UI Resources
Resources served with MIME type `text/html;profile=mcp-app`:
- `ui://coffee-chat/confirm-bean.html` — Confirm Bean Card
- `ui://coffee-chat/bean-picker.html` — Bean Picker
- `ui://coffee-chat/perspective-diff.html` — Perspective Diff Card

Tools (every tool returns both human-readable `content` fallback for CLI hosts and `structuredContent` for MCP Apps):
1. `get_profile` (`beans:read`)
2. `list_beans` (`beans:read`, `_meta.ui.resourceUri: "ui://coffee-chat/bean-picker.html"` when `interactive: true` or conflict present)
3. `get_bean` (`beans:read`)
4. `prepare_bean` (`beans:write`, `_meta.ui.resourceUri: "ui://coffee-chat/confirm-bean.html"`)
5. `save_bean` (`beans:write`, visible to `["model", "app"]`)
6. `set_bean_visibility` (`beans:write`, visible to `["model", "app"]`)
7. `delete_bean` (`beans:write`, visible to `["model", "app"]`)
8. `manage_shelf` (`beans:read` for list, `beans:write` for add/remove)
9. `compare_perspectives` (`beans:read`, `_meta.ui.resourceUri: "ui://coffee-chat/perspective-diff.html"`)

---

## 6. Zero-AI Web Home (`apps/web` + `@openboa/yogurt`)

Built with Next.js App Router (React 19.2) and `@openboa/yogurt`, verified by `yogurt check`:
- `/` & `/connect`: Product overview + copyable MCP configuration for Codex, Claude Code, ChatGPT, Antigravity, and Cursor.
- `/me`: Authenticated My Roastery — private & public Beans, relation badges (`supersedes`, `refines`, `tensions_with`), 1-click visibility toggle (with redaction confirm for `work_episode`), delete, Shelf list, JSON/Markdown export, GitHub/Google explicit account linking, and active MCP OAuth grant revocation.
- `/@[handle]` (also routed cleanly as `/u/[handle]` with `/@[handle]` alias): Person Page showing `publicCount` & `privateCount`, public Beans, public-only relations, 1-click **Save to Shelf**, and **Open Coffee Chat / Brew in Agent** handoff snippet.
- `/sources/[id]`: Source Compare — side-by-side comparison of public Beans referencing the same normalized URL.

---

## 7. Independent Taste Evaluation (`evals/`)

`evals/` interacts only with public Skill definitions and MCP/CLI contracts (never importing `packages/core` internals):
- **6 frozen core scenarios:**
  1. `roast-work-capture`: Extracts a crisp trade-off & boundary from a work correction and calls `prepare_bean` with `visibility: "private"`.
  2. `roast-reject-unconfirmed`: Refuses to call `save_bean` when the user gives an ambiguous or declined reply.
  3. `brew-work-divergence-a-vs-b`: Same engineering decision task under Persona A vs Persona B confirmed Beans produces materially divergent choices aligned to each Bean's `tradeoff` (not merely tone).
  4. `brew-work-tension-picker`: Surfaces conflict/clarification instead of silently merging two Beans linked by `tensions_with`.
  5. `brew-talk-no-impersonation`: Explores an author's public Beans while disclosing record attribution and never claiming to be the author.
  6. `brew-boundary-withhold`: Withholds applying a Bean when the current task falls outside its stated `boundary`.
- Includes deterministic protocol/rubric verification tests plus a paired LLM smoke runner (`No-Bean` vs `Persona A` vs `Persona B`) that generates a structured report when model credentials are present (or explicitly records `not_run` with exact invocation instructions when offline).
