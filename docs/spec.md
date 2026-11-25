# Coffee Chat MVP Technical Specification

**Status:** Canonical MVP contract (2026-11-24). Governs `packages/core`, `packages/ui`, `packages/mcp-apps`, `apps/web`, `skills/`, and `evals/`. Designed alongside [docs/intent.md](intent.md), [docs/ux-plan.md](ux-plan.md), and [docs/engineering/mvp-redesign/spec.md](engineering/mvp-redesign/spec.md).

---

## 1. Architecture & Repository Boundaries

Coffee Chat ships as a single npm workspaces monorepo with strict internal boundaries:

| Path | Owns | Must Not Own |
| --- | --- | --- |
| `packages/core` | Domain schemas, URL normalizer, RFC 8785 JCS digest, Drizzle Postgres schema (Neon + PGlite driver), Bean/Origin/Relation/Shelf/Insights/Receipt/OAuth/Account services, privacy & concurrency invariants | HTTP/Next.js framework glue, React UI, LLM calls |
| `packages/ui` | Shared `@openboa/yogurt` presentation components (`ConfirmBeanCard`, `BeanPicker`, `PerspectiveDiffCard`, `BeanCard`) and shared presentation types | Direct DB access, secrets, custom `.cc-*` CSS layout replacements |
| `packages/mcp-apps` | Self-contained HTML/JS MCP App bundles (`ui://coffee-chat/*.html`) using `@modelcontextprotocol/ext-apps` + `@coffee-chat/ui` + `@openboa/yogurt` | Unbundled external script/style links |
| `apps/web` | Next.js App Router Zero-AI Web service, Better Auth (GitHub + Google + dev/test-only local adapter), OAuth 2.1 `/api/mcp` Streamable HTTP endpoint, `@openboa/yogurt` App Shell & screens | Server-side LLM or embedding API calls, URL crawling |
| `skills/` | Host-neutral `SKILL.md` specifications (`roast`, `brew`) and host packaging manifests | Private user data, secrets |
| `evals/` | Candidate-independent Taste evaluation harness, 6 frozen scenarios, deterministic contract checks, paired A/B smoke runner | Imports from `packages/core` internals |

---

## 2. Data Model (Postgres / Drizzle — Preserved 15-Table Schema)

### 2.1 `users` & Auth (`users`, `sessions`, `accounts`, `verifications`)
- Managed by Better Auth (`users`, `sessions`, `accounts`, `verifications`) plus public profile fields (`handle` unique lowercase slug, `name`).
- Login providers: **GitHub** and **Google** configured with `accountLinking: { enabled: true, disableImplicitLinking: true, trustedProviders: ["github", "google"], allowDifferentEmails: true }`. Implicit OAuth sign-in auto-merging remains **disabled** (`disableImplicitLinking: true`), while authenticated users can explicitly link additional providers via Better Auth `/api/auth/link-social` (`linkSocial()`, which requires a Better Auth `sessions` row); unlinking the last remaining login method is rejected (`400 LAST_LOGIN_METHOD`).
- A dev/test-only local auth route/adapter (`/api/test-auth/login`, `/api/test-auth/logout`) using the `cc_test_session` cookie is enabled **only** when `NODE_ENV !== 'production'` and `COFFEE_CHAT_ENABLE_TEST_AUTH === 'true'`, strictly disabled in production builds. Unverified JSON `POST /api/accounts` linking is gated strictly to `isTestAuthEnabled()` (non-production only) so production accounts can only link via verified OAuth `/api/auth/link-social`, while `GET`/`DELETE /api/accounts` remain available to authenticated users.
- Account-deletion service (`deleteUserAccount` in `packages/core/src/services/accounts.ts`) revokes OAuth grants and deletes the user record; exposing a self-serve account-deletion HTTP route and custom `@handle` rename endpoint is **explicitly deferred out of MVP build scope** unless separately scheduled.

### 2.2 `origins` & `bean_origins`
- `origins`: `id` (UUID), `kind` (`source_excerpt` | `work_episode`), `normalized_url` (unique nullable text for `source_excerpt`; `null` for `work_episode`), `created_at`.
- `bean_origins`: `id`, `bean_id` (FK cascade), `origin_id` (FK cascade), `position` (1..8 ordered origins per Bean).
- URL normalization: standard `URL` parser; lowercase scheme (`http:`/`https:` only) and host; strip default ports (`80`/`443`); reject embedded credentials (`username`/`password`); preserve path and query verbatim; strip fragment from `normalized_url` (stored in citation `locator`). Server never fetches input URLs.

### 2.3 `beans` & `bean_revisions`
- `beans`: `id` (UUID), `owner_id` (FK `users.id`), `visibility` (`private` default | `public`), `current_revision_id`, `version` (integer starting at `1`, incremented on every content revision OR visibility mutation), `created_at`, `updated_at`.
- `bean_revisions`: immutable snapshots: `id`, `bean_id`, `revision_number`, `title`, `take`, `tradeoff`, `boundary`, `uncertainty` (nullable), `tags` (`jsonb` `string[]`, max 12, lowercased/deduped), `origins_json` (ordered array of `{originId, kind, url, sourceTitle, quotation, locator, episodeSummary}`), `search_document` (GIN Postgres `tsvector` index `'simple'` over `title`, `take`, `tradeoff`, `boundary`, `tags`), `payload_digest` (hex SHA-256), `attestation_kind` (`agent_attested` | `ui_attested`), `created_at`.

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

### 2.7 OAuth 2.1 Tables (`oauth_clients`, `oauth_grants`, `oauth_auth_codes`, `oauth_tokens`)
- Preserved unchanged from existing Drizzle schema (`packages/core/src/db/schema.ts`).

---

## 3. Canonical Payload Digest, Optimistic Concurrency & Deterministic Read Contracts

### 3.1 Canonical Payload Digest & Optimistic Concurrency (Preserved)
- `prepareBean` normalizes inputs, resolves `origins` (without inserting persistent rows), fills absent optional fields with explicit `null`, validates same-owner relations and `supersedes` acyclicity, and computes:
  - Canonical object `{ schema: "coffee-chat-bean-v1", ownerId, beanId, expectedVersion, title, take, tradeoff, boundary, uncertainty, tags, visibility, origins, relations }`
  - Serialized with **RFC 8785 JCS** (deterministic UTF-16 code-unit key sorting, ECMAScript number/string formatting)
  - `digest = sha256(utf8Bytes)` (lowercase 64-hex string)
  - Fresh `operationKey` (UUID)
  - `requiresRedactionConfirmation = (visibility === "public" && hasWorkEpisode)`
- `saveBean` checks `(ownerId, operationKey)` idempotency first, recomputes the digest server-side from submitted canonical fields and authenticated `ownerId` (`400 DIGEST_MISMATCH` on mismatch), enforces `redactionConfirmed === true` when publishing a `work_episode` (`400 REDACTION_REQUIRED`), and atomically persists with optimistic lock check.
- Creating a new Bean requires `beanId: null` and `expectedVersion: null`.
- Updating content, changing visibility, or deleting requires `expectedVersion` matching current `beans.version`; mismatch returns `409 VERSION_CONFLICT` with latest version metadata.

### 3.2 Deterministic Read, Aggregation & Hydration Contracts (Existing + Additive Build Targets)

All search, comparison, stats, and Shelf hydration stay **100% deterministic SQL/TypeScript** in `packages/core` and `apps/web` Server Components/API routes—with **zero LLM calls** and **zero unbacked telemetry** (no view counts, impressions, or external Brew execution counts).

| Capability | Current Baseline (`5015314`) | Target Contract (MVP Redesign Build) | Privacy Guarantee |
|---|---|---|---|
| **Personal Insights (`/me?tab=insights`)** | Only `publicCount` / `privateCount` badges computed in `RoasteryClient` | **Additive helper `getPersonalInsights(db, ownerId)`** returning: `{ totalCount, publicCount, privateCount, originMix: { readingCount, workCount, uniqueSourceUrlCount }, captureMix: { agentAttestedCount, uiAttestedCount }, lifecycle: { activeCount, inTensionCount, supersededCount }, revisionCount, relationCounts: { supersedes, refines, tensionsWith }, topTags: { tag, count }[], monthlyActivity: { month, count }[], activeGrantCount, shelfCount }` (`shelfCount = listShelf(db, ownerId).length` live-resolved; `lifecycle` mutually exclusive `superseded` > `in_tension` > `active` summing to `totalCount`; `originMix` non-exclusive presence counts across each Bean's origins) | Owner-only (`requireCurrentUser` / SSR `user.id`). Never exposed publicly. |
| **Workspace Search, Filtering & Pagination (`/me`, `/api/beans`)** | `listBeans` supports `scope`, `query` (FTS + ILIKE), `tag`, `ownerHandle`, `originUrl`, `visibility`, `limit` (no `offset` / `originKind` / `lifecycleState`) | **Additive filter options on `listBeans` / `listBeansPage`:** `offset`, `originKind` (`source_excerpt` \| `work_episode`), `lifecycleState` (`active` \| `in_tension` \| `superseded`), returning `{ items, totalCount, hasMore }` | Enforces `ownerId === viewerId` for `mine`; `visibility === 'public'` for `public`/`shelf`; non-owner `lifecycleState` filters MUST check only `bean_relations` where **both** endpoints have `visibility = 'public'` |
| **Public Discovery Pagination & Search (`/`, `/sources`)** | `listPublicPeople(db, limit)` and `listPublicSources(db, limit)` with no search/offset | **Additive `query`, `tag`, `offset`, `limit` options** on `listPublicSources` and `listPublicPeople` (plus `totalCount`) so Home & `/sources` search the entire public corpus server-side | Strictly filters `beans.visibility = 'public'`; omits users/URLs with 0 public Beans |
| **Public Profile Summary (`/@[handle]`)** | `getPersonProfile` returns `publicCount`, `privateCount`, `publicBeans` (`viewerId = null`) | Preserve `getPersonProfile(db, null, handle)` invariant; derive **public-only** profile insights (`topPublicTags`, `publicOriginMix`, `publicTableCount`) exclusively from `publicBeans` | `privateCount` is count-only; zero private tags, origins, timestamps, or edges |
| **Source Compare & Owner Private Stance (`/sources/[id]`)** | `getSourceCompare(db, originIdOrUrl)` returns public Beans only (throws `404` if 0 public) | Preserve `getSourceCompare` `404` when `0` public Beans exist (even if the signed-in user owns a private Bean on that URL). Add **owner-only** helper `getViewerStanceForOrigin(db, viewerId, originId)` returning `null` when `viewerId` is null/empty and otherwise returning the viewer's own matching Beans (`private` and `public`) for the signed-in owner's private banner ONLY | Public response remains `publicBeans` only; private-only URLs still return `404`; private stance never leaves owner's authenticated SSR/API response |
| **Live Shelf Hydration & Saved Source Link (`/`, `/@[handle]`, `/sources/[id]`, `/me?tab=saved`)** | `listShelf(db, userId)` exists without `firstSourceOriginId`, and public SSR pages pass empty state | Extend `ShelfEntryView.bean` (`packages/core/src/services/shelf.ts`) with `firstSourceOriginId: string | null` (derived from `rev.originsJson` where `kind === "source_excerpt"` and `originId != null` while `visibility === "public"`) for `/me?tab=saved` source links without N+1 fetches; hydrate browse pages (`/`, `/@[handle]`, `/sources/[id]`) with `{ targetType, targetId, shelfItemId }` from `listShelf(db, user.id)` so unsave toggles pass `shelfItemId` cleanly to `DELETE /api/shelf` | Requires authenticated session; omits private/deleted targets automatically |
| **Explicit Provider Account Linking (`/me?tab=settings`)** | `/api/accounts` (`GET`, `POST`, `DELETE`) + `linkProviderAccount` / `unlinkProviderAccount` exist; UI only exposes `Unlink` | Configure Better Auth `accountLinking: { enabled: true, disableImplicitLinking: true, trustedProviders: ["github", "google"], allowDifferentEmails: true }`; wire `/api/auth/link-social` (`linkSocial`, requiring a Better Auth `sessions` row) for GitHub & Google; gate unverified `POST /api/accounts` strictly to `isTestAuthEnabled()` (for `cc_test_session` E2E); preserve `DELETE /api/accounts` unlink guard (`400 LAST_LOGIN_METHOD`) and `409 ACCOUNT_ALREADY_LINKED` | `disableImplicitLinking: true` keeps silent email auto-merge disabled; production never accepts unverified `POST /api/accounts` JSON linking |

---

## 4. Privacy & Access Control Matrix (Immutable)

| Resource | Owner | Authenticated Non-Owner | Anonymous Visitor |
| --- | --- | --- | --- |
| Person Page counts (`publicCount`, `privateCount`) | Allowed | Allowed | Allowed |
| Public Bean (content, origins, public-only relations) | Allowed | Allowed | Allowed |
| Private Bean (content, origins, tags, timestamps, ID lookup) | Allowed | `404 Not Found` | `404 Not Found` |
| Relation edge touching any Private Bean | Allowed | Filtered out (hidden) | Filtered out (hidden) |
| Historical revisions (`bean_revisions`) of a Public Bean | Allowed | Denied (`404` / omitted) | Denied (`404` / omitted) |
| Personal Insights (`getPersonalInsights`) | Allowed | Denied (`401`/`403`) | Denied (`401`) |
| Origin / Source Compare page (`/sources/[id]`) | Public Beans + private owner stance banner | Public Beans only; `404` if 0 public Beans | Public Beans only; `404` if 0 public Beans |
| Mutations (`save_bean`, `set_bean_visibility`, `delete_bean`) | Owner + `beans:write` scope (or web session) | Denied (`403`/`404`) | Denied (`401`) |
| `work_episode` transition to `public` | Allowed with explicit `redactionConfirmed: true` flag (`400 REDACTION_REQUIRED` otherwise) | Denied | Denied |
| Shelf (`shelf_items`) | Reads/writes own live references to `public` targets only | Denied (`401`) | Denied (`401`) |

All authenticated API routes and SSR pages rendering viewer-specific state (`Your Stance Banner` or hydrated `shelf_items` / auth state—specifically `/me`, `/`, `/@[handle]`, `/sources/[id]`, `/connect`, and `/oauth/consent`) emit `Cache-Control: private, no-store` so private transitions, revocations, and deletions take effect immediately without stale CDN or browser caching.

---

## 5. OAuth 2.1 MCP & MCP Apps Contract (Preserved)

### 5.1 OAuth 2.1 Discovery & Revocation
- Endpoint: `/api/mcp` (Streamable HTTP JSON-RPC `2025-03-26`).
- Unauthenticated requests return `401` with `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"`.
- Serves `/.well-known/oauth-protected-resource` (RFC 9728) and `/.well-known/oauth-authorization-server`.
- Supports Authorization Code + PKCE (`S256`), scopes `beans:read`, `beans:write`, `offline_access`, client registration via CIMD (SSRF-safe URL validation via `assertSafeCimdUrl`) and DCR.
- Opaque SHA-256 hashed access (1h) & refresh (30d) tokens bound to a stable `grantId`. Every `/api/mcp` request verifies active token + non-revoked grant + audience/resource + required scope without cross-request caching.
- Revoking a grant via `/me?tab=settings` or `/api/grants/[id]/revoke` sets `revokedAt` and atomically invalidates all access tokens, refresh tokens, and unconsumed auth codes for that grant; re-consent always creates a new `grantId` and never revives revoked tokens.

### 5.2 MCP Tools & UI Resources
Resources served with MIME type `text/html;profile=mcp-app`:
- `ui://coffee-chat/confirm-bean.html` — `ConfirmBeanCard`
- `ui://coffee-chat/bean-picker.html` — `BeanPicker`
- `ui://coffee-chat/perspective-diff.html` — `PerspectiveDiffCard`

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

## 6. Zero-AI Web Service (`apps/web` + `@openboa/yogurt@0.2.0-local.1`)

Built with Next.js 15 App Router (React 19.2) and `@openboa/yogurt@0.2.0-local.1` (87 core components, 29 motion components, 14 editable recipes, backed by `@ui-sdk/core@0.1.0-beta.13` & `@ui-sdk/react@0.1.0-beta.13`), verified by `npm run check:yogurt`.

### 6.1 `@openboa/yogurt@0.2.0-local.1` Configuration & Component Architecture
- **Package Pin & Surface Coverage (`yogurt.config.json`):** Upgrade all 4 monorepo `package.json` pins (`root`, `packages/ui`, `packages/mcp-apps`, `apps/web`) and `yogurt.config.json` to `@openboa/yogurt@0.2.0-local.1` (`vendor/openboa-yogurt-0.2.0-local.1.tgz`), and declare `packages/ui/src`, `packages/mcp-apps/src`, `apps/web/src/components`, **and `apps/web/src/app`** so `yogurt check` validates all App Router layouts, routes, and stylesheets.
- **RSC & Entry Imports:** Do not import the monolithic barrel `@openboa/yogurt` inside React Server Components (`layout.tsx`, `sources/page.tsx`, `oauth/consent/page.tsx`); use verified `0.2.0-local.1` per-entry imports (for example `@openboa/yogurt/button`, `@openboa/yogurt/card`, `@openboa/yogurt/navbar`, `PageHeader` from `@openboa/yogurt/top`, `DisclosureRow` from `@openboa/yogurt/disclosure-row`, all `Sidebar*` parts from `@openboa/yogurt/sidebar-layout`, `StatCard` from `@openboa/yogurt/motion-stat-card`, `CopyButton` from `@openboa/yogurt/motion-copy-button`). Because all 116 `packages/web/dist/entries/*.js` files start with `"use client";`, Server Components must never pass function props across the RSC boundary and must wrap interactive controls in explicit `"use client"` client modules.
- **Brand Identity & Tokens:** Because `@openboa/yogurt@0.2.0-local.1` `ProjectMark` defines only `"openboa" | "yogurt" | "meatball" | "sourdough"`, Coffee Chat uses a dedicated wordmark + geometric mark styled with `--yg-*` / `--boa-color-*` tokens and NEVER misuses `AgentAvatar` (`bean-top`) as the product brand logo.
- **`0.2.0` Calibration & No Custom Layout CSS:** Remove all 21 `.cc-*` CSS classes (`packages/ui/src/styles.css`) and inline layout styles in favor of Yogurt `SidebarLayout`, `Navbar`, `PageHeader`, `Card` (`density`, `variant`), `Table` / `DataTable`, `FilterBar`, `List` (`divided`), `ListRow`, `GridList`, `StatCard`, `Chart`, `Progress`, `RecordFacts`, `Sheet`, `Trace`, `CopyButton`, `Toast`, `EmptyResult`, `Result`, `Stack`, `Inline`, `Grid`, and `Text`. Obey Yogurt `0.2.0` visual rules: `@layer ui-sdk, yg.tokens, yg.base, yg.components, yg.patterns, yg.utilities;` cascade, zero CSS gradients, zero static card drop shadows, monochrome default controls (`--yg-inverse`) with `Button tone="brand"` (`#175174`) reserved strictly for primary commitment CTAs, `Badge dot={false}` on pure numeric counts, and zero nested `<Link><Button>` markup.
- **Surface & Appearance:** Standardize `Yogurt` root on `material="neutral"` across `apps/web` and `packages/mcp-apps`, and wire persistent `appearance` (`auto` | `light` | `dark`) switching.
- **Dual-Label Terminology Pattern:** User-facing surfaces pair Coffee Chat signature terms (**Bean**, **Roast**, **Brew**, **My Roastery**, **Tasting Notes**, **Shelf**, **Tables**, **Roast Log**) with subtle plain-language sub-labels directly underneath via native `0.2.0` Yogurt secondary slots (`PageHeader.detail`, `SidebarItem.description`, `Card.description`, `ListHeader.detail`, `ListRow.description`, `StatCard.detail`, and form field `help`), keeping top-nav `label` strings concise while strictly prohibiting raw protocol/MCP syntax on all user surfaces.
- **`@ui-sdk/*` Runtime Boundary:** `@ui-sdk/core` and `@ui-sdk/react` arrive transitively through `@openboa/yogurt@0.2.0-local.1`. Product UI must compose from `@openboa/yogurt/<entry>` primitives rather than bypassing Yogurt styles with raw HTML controls.

### 6.2 Route Architecture

| Route | Component Architecture | Key Capabilities |
|---|---|---|
| `/` | `HomeClient` (**Explore** · *Fresh Beans & active tables*) | Unseeded onboarding `Result` when 0 public Beans exist; server-backed search & domain filter (`?q=&tag=&page=`); Featured Table; Fresh Beans on the Table with live-hydrated Shelf actions; Active Voices (`publicCount` + `privateCount`) |
| `/me` | `WorkspaceClient` (**My Roastery** · `SidebarLayout` + 4 views with `SidebarItem.description`: `My Beans`, `Tasting Notes`, `Shelf`, `AI & Account`) | Progressive 2-stage multi-origin Roast in `Sheet` with segmented `Progress` (`?compose=1`); My Beans filtering by domain, origin kind, lifecycle (`Active`/`In Tension`/`Superseded`/`Private`); Inspector with **Roast Log** (`bean_revisions`) `Trace` timeline & `bean_relations` resolution; **Tasting Notes** (`StatCard`, `Count`, `Chart`, `Progress`, `RecordFacts`); **Shelf** (*Saved voices & takes* with trade-offs + Table links); **AI & Account** (`oauth_grants` status/revocation, explicit GitHub/Google linking + unlink guard, JSON/MD export) |
| `/sources` | `SourcesDirectoryPage` (**Tables** · *Compare takes on a source*) | Server-backed search & pagination over `listPublicSources`; contributor & Bean counts; empty-state guidance |
| `/sources/[id]` | `SourceCompareClient` (**Table** · *Side-by-side takes on one source*) | Source `PageHeader` & `RecordFacts`; signed-in **Your Stance Banner** (private/public/none); Axis-by-Axis Comparison Matrix (`Table` / `Card`s); pre-filled Roast drawer; live-hydrated Save to Shelf; plain-language Brew prompt dialog |
| `/@[handle]` (`/u/[handle]`) | `PersonClient` (**Voice Profile** · *Public Beans & Coffee Chat*) | Invariant `publicCount` + `privateCount`; public-only origin & domain `RecordFacts`; public Beans list + public-only relations; live-hydrated Add to Shelf (`person` & `bean`); plain-language Brew handoff |
| `/connect` | `ConnectClient` (**Brew Setup** · *Connect your AI apps*) | Live `oauth_grants` status banner when signed in; 5-host config switcher (Codex, Claude Code, ChatGPT, Antigravity, Cursor); plain-language starter prompts (zero MCP syntax) |
| `/signin` | `SignInPanel` (**Sign In** · *Enter your Roastery*) | GitHub & Google Better Auth OAuth buttons; non-production `test-auth` quick login (when `COFFEE_CHAT_ENABLE_TEST_AUTH=true`); open-redirect-safe `returnTo` validation (`returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")`, defaulting to `"/me"`) |
| `/oauth/consent` | `ConsentClient` (**Brew Authorization** · *Connect an AI app*) | Unauthenticated redirect to `/signin?returnTo=...`; client/resource/scope verification; Approve / Deny PKCE flow |

### 6.3 State & Error Matrix

| State / Condition | Trigger | Required Web Behavior |
|---|---|---|
| **Unauthenticated Protected Route** | Visit `/me` or `/oauth/consent` logged out | Server `redirect('/signin?returnTo=<encoded>')`; after login, return to `returnTo` |
| **Unauthenticated Save / Capture** | Click Save or Add take logged out | Redirect or prompt sign-in preserving `returnTo` |
| **Unseeded Empty Database** | `0` public Beans on `/` or `/sources` | Purposeful `Result` / `EmptyResult` onboarding CTA (no blank page or broken demo assumption) |
| **Filtered Empty Search** | Search/tag filter returns 0 rows | `EmptyResult` with 1-click **Clear filters** |
| **Loading / Pending Mutation** | Submitting `prepareBean` → `saveBean`, visibility toggle, delete, or grant revoke | Button `pending` spinner; controls disabled against double-submit |
| **`400 VALIDATION_ERROR`** | Missing required field or URL with credentials/non-HTTP(S) | Inline field validation message preserving user draft |
| **`400 REDACTION_REQUIRED`** | Toggle `work_episode` take to `public` without `redactionConfirmed` | Open redaction `Dialog` with explicit `Checkbox` + confirm `Button` (`ConfirmDialog` lacks `children`) before retry |
| **`409 VERSION_CONFLICT`** | Stale `expectedVersion` during edit, visibility toggle, or delete | Non-destructive warning `Notice` with **Reload latest version** action |
| **`409 IDEMPOTENCY_CONFLICT`** | Reused `operationKey` with altered canonical payload | Surface error `Notice` and generate fresh `operationKey` on retry |
| **`400 LAST_LOGIN_METHOD`** | Attempt to unlink sole remaining login provider | Unlink button disabled in UI; API rejects with `400 LAST_LOGIN_METHOD` |
| **`409 ACCOUNT_ALREADY_LINKED`** | Attempt to link provider identity already owned by another user | Error `Notice` explaining provider belongs to another account; profile unchanged |
| **`404 NOT_FOUND`** | Unauthorized private Bean ID, private-only `/sources/[id]`, or unknown `@handle` | Next.js `notFound()` (`404`) leaking zero existence details |

---

## 7. Independent Taste Evaluation (`evals/`)

`evals/` interacts only with public Skill definitions (`skills/roast/SKILL.md`, `skills/brew/SKILL.md`) and MCP/CLI contracts (never importing `packages/core` internals):
- **6 frozen core scenarios:**
  1. `roast-work-capture`: Extracts a crisp trade-off & boundary from a work correction and calls `prepare_bean` with `visibility: "private"`.
  2. `roast-reject-unconfirmed`: Refuses to call `save_bean` when the user gives an ambiguous or declined reply.
  3. `brew-work-divergence-a-vs-b`: Same engineering decision task under Persona A vs Persona B confirmed Beans produces materially divergent choices aligned to each Bean's `tradeoff` (not merely tone).
  4. `brew-work-tension-picker`: Surfaces conflict/clarification instead of silently merging two Beans linked by `tensions_with`.
  5. `brew-talk-no-impersonation`: Explores an author's public Beans while disclosing record attribution and never claiming to be the author.
  6. `brew-boundary-withhold`: Withholds applying a Bean when the current task falls outside its stated `boundary`.
- Includes deterministic protocol/rubric verification tests plus a paired LLM smoke runner (`No-Bean` vs `Persona A` vs `Persona B`) that generates a structured report when model credentials are present (or explicitly records `not_run` with exact invocation instructions when offline).
