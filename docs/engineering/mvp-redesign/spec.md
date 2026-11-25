# Engineering Specification: Coffee Chat MVP Redesign

**Status:** Scoped implementation specification (2026-11-24).
**Governs:** Subsequent implementation milestones **M1–M4** executing [docs/intent.md](../../intent.md), [docs/ux-plan.md](../../ux-plan.md), [docs/spec.md](../../spec.md), and [docs/acceptance/first-loop/spec.md](../../acceptance/first-loop/spec.md).

---

## 1. Problem & Scope

Commit `5015314` shipped a copy/tab reskin over a solid `packages/core` and OAuth 2.1 MCP backend, leaving nine structural UX/IA and `@openboa/yogurt` setup gaps:
1. Coffee Chat vocabulary was inconsistent (`My Table` / `Bean` / `Saved Voices`) without clear plain-language sub-labels, and raw MCP calls (`list_beans(...)`, `compare_perspectives(...)`) leaked into clipboard handoff dialogs.
2. `/me` exposed only a flat card list—ignoring `bean_revisions` history, `bean_relations` resolution (`tensions_with`, `supersedes`, `refines`), decision-domain organization, and real `oauth_grants` connection status.
3. Web capture forced a 9-field single-origin monolith instead of progressive 2-stage capture supporting 1–8 origins.
4. Zero deterministic stats or insights existed on `/me`, `/@[handle]`, or `/sources/[id]`.
5. `shelf_items` state was unhydrated on `/`, `/@[handle]`, and `/sources/[id]`, resetting Save state on reload.
6. Explicit GitHub/Google provider account-linking UI was absent on `/me` (and Better Auth's `accountLinking.enabled: false` blocked both implicit merging and explicit `/api/auth/link-social` calls).
7. Unseeded production `/` rendered empty, and Home search filtered only 12 recent items in browser memory.
8. `/sources/[id]` stacked cards without an axis-by-axis comparison matrix or signed-in private-stance awareness.
9. `@openboa/yogurt` setup was pinned to `0.1.0-local.15`, excluded `apps/web/src/app` from `yogurt.config.json`, relied on `"use client"` barrel imports in Server Components, misused `AgentAvatar` (`bean-top`) as the brand mark, carried 21 custom `.cc-*` CSS classes and inline styles, wrapped `<Button>` inside `<Link>`, and mismatched `material` (`paper` vs `neutral`) with no `appearance` mode switching.

### In Scope for Subsequent Implementation (M1–M4)
- Upgrading to `@openboa/yogurt@0.2.0-local.1` (`vendor/openboa-yogurt-0.2.0-local.1.tgz`, backed by `@ui-sdk/core@0.1.0-beta.13` & `@ui-sdk/react@0.1.0-beta.13`) and remediating configuration, per-entry imports, tokens, `@layer` cascade, and `0.2.0` component primitives across `apps/web`, `packages/ui`, and `packages/mcp-apps`.
- Adding deterministic SQL/TypeScript aggregation, pagination, filtering, and Shelf/stance hydration helpers in `packages/core` and `apps/web`.
- Rebuilding web routes (`/`, `/me`, `/sources`, `/sources/[id]`, `/@[handle]`, `/connect`, `/signin`, `/oauth/consent`) around Personal Workflow, Sharing Perspectives, and Deterministic Stats/Insights.
- Expanding Vitest and Playwright E2E verification to cover all criteria in [docs/acceptance/first-loop/spec.md](../../acceptance/first-loop/spec.md).

### Explicitly Out of Scope (Preserved / Deferred)
- **No database schema migration breaking the 15-table Drizzle contract:** All stats, insights, lifecycle filters, and hydration derive from the existing 15 tables (`users`, `sessions`, `accounts`, `verifications`, `origins`, `beans`, `bean_revisions`, `bean_origins`, `bean_relations`, `shelf_items`, `mutation_receipts`, `oauth_clients`, `oauth_grants`, `oauth_auth_codes`, `oauth_tokens`).
- **No server-side AI/LLM calls, embeddings, or URL fetching:** Web and core stay 100% Zero-AI.
- **No unbacked telemetry:** Do not store or display view counts, impressions, or external AI Brew invocation logs.
- **No `deleteUserAccount` HTTP route or `@handle` rename endpoint in this MVP cycle:** `deleteUserAccount` stays in `packages/core/src/services/accounts.ts`; user-facing self-delete and handle-rename routes remain deferred unless scheduled separately.
- **No direct UI bypass around `@openboa/yogurt`:** `@ui-sdk/core` and `@ui-sdk/react` are bundled dependencies of `@openboa/yogurt@0.2.0-local.1`; product views compose from `@openboa/yogurt/<entry>` primitives rather than hand-styled raw HTML controls.

---

## 2. Preserved Invariants & Privacy Boundaries

Every milestone MUST preserve without relaxation:
1. `prepareBean` (RFC 8785 JCS SHA-256 `digest` + `operationKey`) → explicit author confirmation → `saveBean` (`expectedVersion` lock, `mutation_receipts` idempotency/non-resurrection).
2. Default visibility = `private`; unauthorized `getBean` and private-only `getSourceCompare` throw `404 NOT_FOUND`; `hydrateRelationsForBean` strips edges touching private Beans for non-owners; `getPersonProfile` invokes `getBean(db, null, id)` for `publicIds` only and exposes only aggregate `publicCount` and `privateCount` (zero private tags, origins, timestamps, or edges).
3. Publishing a `work_episode` Bean requires `redactionConfirmed: true` (`400 REDACTION_REQUIRED` otherwise).
4. `shelf_items` resolves live against `visibility = 'public'`; private or deleted targets vanish immediately.
5. Better Auth configured with `accountLinking: { enabled: true, disableImplicitLinking: true, trustedProviders: ["github", "google"], allowDifferentEmails: true }` (implicit OAuth sign-in auto-merging remains **disabled** via `disableImplicitLinking: true`, while explicit `/api/auth/link-social` works for authenticated Better Auth sessions); unverified JSON `POST /api/accounts` gated strictly to `isTestAuthEnabled()` (non-production only); `unlinkProviderAccount` rejects the last remaining login method (`400 LAST_LOGIN_METHOD`); `/api/test-auth/*` stays strictly disabled when `NODE_ENV === "production"` or `COFFEE_CHAT_ENABLE_TEST_AUTH !== "true"`.
6. OAuth 2.1 discovery, CIMD SSRF guard, PKCE `S256`, 9 MCP tools, and 3 self-contained MCP App HTML bundles stay intact.

---

## 3. Additive Core & API Contracts

### 3.1 `packages/core` Additive Functions (`packages/core/src/services/beans.ts`, `shelf.ts`, & `types.ts`)

1. **`getPersonalInsights(db, ownerId)` -> `Promise<PersonalInsightsView>`:**
   - Queries strictly `WHERE owner_id = ownerId` (joins `beans`, `bean_revisions`, `bean_relations`, `oauth_grants`, and resolves `shelfCount` live).
   - **Deterministic edge-case formulas:**
     - `originMix`: non-exclusive presence counts across each owned Bean's `origins` (`readingCount` counts owned Beans containing at least one `source_excerpt` origin; `workCount` counts owned Beans containing at least one `work_episode` origin; multi-origin Beans with both kinds increment both counters). `uniqueSourceUrlCount` counts distinct `normalizedUrl` values across owned `source_excerpt` origins.
     - `lifecycle`: mutually exclusive precedence **`superseded` (`supersededByBeanId !== null`) > `in_tension` (`hasTension && !superseded`) > `active` (neither)**, guaranteeing `activeCount + inTensionCount + supersededCount === totalCount`.
     - `shelfCount`: live-resolved via `listShelf(db, ownerId).length` (never raw `COUNT(*) FROM shelf_items`), so private or deleted saved targets are excluded consistently with `/me?tab=saved`.
   - Returns:
     ```ts
     export interface PersonalInsightsView {
       totalCount: number;
       publicCount: number;
       privateCount: number;
       originMix: {
         readingCount: number;
         workCount: number;
         uniqueSourceUrlCount: number;
       };
       captureMix: {
         agentAttestedCount: number;
         uiAttestedCount: number;
       };
       lifecycle: {
         activeCount: number;
         inTensionCount: number;
         supersededCount: number;
       };
       revisionCount: number;
       relationCounts: {
         supersedes: number;
         refines: number;
         tensionsWith: number;
       };
       topTags: Array<{ tag: string; count: number }>;
       monthlyActivity: Array<{ month: string; count: number }>;
       activeGrantCount: number;
       shelfCount: number;
       asOf: string;
     }
     ```
2. **Extended `listBeans` filters (`ListBeansFilter`):**
   - Add optional `originKind?: OriginKind`, `lifecycleState?: "active" | "in_tension" | "superseded"`, and `offset?: number` (default `0`).
   - **Mandatory non-owner privacy guard:** When filtering by `lifecycleState` (`in_tension` or `superseded`) for non-owners (`scope === "public"` or non-owned rows in `"all_accessible"`), the query/filter MUST check only `bean_relations` where **both** endpoints (`from_bean_id` and `to_bean_id`) have `visibility = 'public'`, preventing inference of private relations attached to a public Bean.
   - Preserve existing `listBeans` array signature (and expose `listBeansPage(db, viewerId, filter): Promise<{ items: BeanSummary[]; totalCount: number; hasMore: boolean }>`) so existing MCP callers remain 100% backward-compatible while `/`, `/me`, and `/api/beans` gain deterministic pagination.
3. **Extended `listPublicSources` & `listPublicPeople` search/pagination:**
   - Add optional `{ query?: string; tag?: string; offset?: number; limit?: number }` and paginated helper variants returning `{ items, totalCount, hasMore }` strictly over `beans.visibility = 'public'`.
4. **Owner-Only Source Stance Helper (`getViewerStanceForOrigin(db, viewerId, originId)`):**
   - Returns `null` immediately if `viewerId` is `null`, `undefined`, or empty (`!viewerId?.trim()`).
   - Otherwise returns the authenticated `viewerId`'s own Beans (both `private` and `public`) linked to `originId`.
   - Never exposed to anonymous or other-user callers (`getSourceCompare` remains strictly public-only and still returns `404` when `0` public Beans exist, even if the signed-in viewer owns a private Bean on that URL).
5. **`ShelfEntryView` Source Link & Browse Hydration (`packages/core/src/services/shelf.ts`):**
   - Extend `ShelfEntryView.bean` with `firstSourceOriginId: string | null` (derived from `rev.originsJson` where `kind === "source_excerpt"` and `originId != null`, resolved live only while `targetBean.visibility === "public"`) so `/me?tab=saved` renders both `tradeoff` and the `/sources/[id]` table link without N+1 fetches.
   - Browse SSR pages (`/`, `/@[handle]`, `/sources/[id]`) hydrate signed-in Shelf state as `{ targetType: "person" | "bean"; targetId: string; shelfItemId: string }[]` (derived from `listShelf(db, user.id)`) so unsave toggles can pass `shelfItemId` directly to `DELETE /api/shelf`.

### 3.2 `apps/web` API, SSR & Auth Routes

| Endpoint / Route | Method | Purpose & Notes |
|---|---|---|
| `/api/beans` | `GET` | Support optional `offset`, `limit`, `originKind`, `lifecycleState` query params; return `{ beans, totalCount?, hasMore? }` with `Cache-Control: private, no-store` |
| `/api/insights` | `GET` | Authenticated (`requireCurrentUser`) → calls `getPersonalInsights(db, user.id)` (`Cache-Control: private, no-store`) |
| `/api/accounts` | `GET`, `POST`, `DELETE` | `GET` & `DELETE` remain authenticated (`400 LAST_LOGIN_METHOD`, `409 ACCOUNT_ALREADY_LINKED`); unverified JSON `POST /api/accounts` MUST be gated strictly to `isTestAuthEnabled()` (non-production `cc_test_session` E2E only; rejected in production) |
| `/api/auth/[...all]` | `GET`, `POST` | Better Auth social sign-in + explicit `/api/auth/link-social` (`linkSocial()`, requiring a Better Auth `sessions` row) with `accountLinking: { enabled: true, disableImplicitLinking: true, trustedProviders: ["github", "google"], allowDifferentEmails: true }` when `GITHUB_*` / `GOOGLE_*` env vars are configured |
| `/signin` | `GET` (SSR) | Enforces open-redirect validation on `returnTo`: `returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")`, otherwise falls back to `"/me"` |
| `/me`, `/`, `/@[handle]`, `/sources/[id]`, `/connect`, `/oauth/consent` | `GET` (SSR) | Any SSR route rendering `Your Stance Banner` or viewer-hydrated Shelf/auth state MUST emit `Cache-Control: private, no-store` |

---

## 4. `@openboa/yogurt` Upgrade & Remediation Checklist (`0.2.0-local.1`)

1. **Upgrade to `@openboa/yogurt@0.2.0-local.1`:** Pack `vendor/openboa-yogurt-0.2.0-local.1.tgz`, update root + `packages/ui` + `packages/mcp-apps` + `apps/web` `package.json`, remove the obsolete `0.1.0-local.15` tarball, update `yogurt.config.json` `"version": "0.2.0-local.1"`, update `README.md` SDK pin, and run `npm install` (resolving bundled `@ui-sdk/core@0.1.0-beta.13` and `@ui-sdk/react@0.1.0-beta.13`).
2. **`yogurt.config.json` surface coverage:** Add `"app": { "target": "web", "root": "apps/web/src/app" }` alongside `ui`, `mcp-apps`, and `web`. Run `npm run check:yogurt` and verify all 4 surfaces pass against `0.2.0-local.1`.
3. **Verified per-entry imports & explicit `"use client"` boundaries:** Replace monolithic `"use client"` barrel imports (`from "@openboa/yogurt"`) with verified `0.2.0-local.1` per-entry imports (`@openboa/yogurt/button`, `@openboa/yogurt/card`, `@openboa/yogurt/navbar`, `PageHeader` from `@openboa/yogurt/top`, `DisclosureRow` from `@openboa/yogurt/disclosure-row`, all `Sidebar*` parts from `@openboa/yogurt/sidebar-layout`, `StatCard` from `@openboa/yogurt/motion-stat-card`, `CopyButton` from `@openboa/yogurt/motion-copy-button`). Because all 116 `packages/web/dist/entries/*.js` files start with `"use client";`, Server Components (`apps/web/src/app/layout.tsx`, `sources/page.tsx`, `oauth/consent/page.tsx`) must never pass function props across the RSC boundary and must wrap interactive controls in explicit `"use client"` client modules.
4. **Brand mark (`ProjectMark`):** Because `0.2.0-local.1` `identity/art-data.d.ts` only provides `"openboa" | "yogurt" | "meatball" | "sourdough"`, replace `<AgentAvatar agent="bean-top" ... />` in `NavHeader` with a dedicated Coffee Chat wordmark + token-colored geometric SVG mark (`--yg-*` / `--boa-color-*` only, zero literal hex).
5. **CSS cleanup & `0.2.0` visual calibration:** Delete all 21 `.cc-*` layout/card/typography classes from `packages/ui/src/styles.css` and remove inline layout styles. Keep any minimal app stylesheet rules inside Yogurt's `@layer` cascade (`@layer ui-sdk, yg.tokens, yg.base, yg.components, yg.patterns, yg.utilities;`) with zero CSS gradients, zero drop shadows on static cards/surfaces, even concentric radii, no Light-stage `#F4F4F1`-on-`#F4F4F1` collisions, monochrome default controls (`--yg-inverse`), `Button tone="brand"` (`#175174`) reserved strictly for primary commitment CTAs, and `Badge dot={false}` on numeric counts.
6. **Valid HTML interactives:** Remove all `<Link><Button>` nesting across `NavHeader`, `HomeClient`, `sources/page.tsx`, `SourceCompareClient`, and `WorkspaceClient`, and compose from Yogurt primitives rather than raw HTML form/heading controls.
7. **Material & appearance:** Set `Yogurt` `material="neutral"` in `apps/web/src/app/layout.tsx` (matching `packages/mcp-apps`) and implement an accessible `appearance` switcher (`auto` | `light` | `dark`) persisted in client preference.
8. **Verified `0.2.0-local.1` component adoption:** Use `SidebarLayout` (and `SidebarItem` with `description` from `@openboa/yogurt/sidebar-layout`), `Navbar`, `PageHeader` (`@openboa/yogurt/top`), `DisclosureRow` (`@openboa/yogurt/disclosure-row`), `FilterBar`, `List` (`divided`) / `ListRow`, `GridList`, `Card` (`density`, `variant`), `Table` / `DataTable`, `StatCard` (`@openboa/yogurt/motion-stat-card`), `Chart`, `Progress` (`presentation="segmented"` for 2-stage Roast), `RecordFacts`, `Count`, `Trace`, `CopyButton` (`@openboa/yogurt/motion-copy-button`), `Toast`, `Dialog` + `Checkbox` (redaction confirmation modal, since `ConfirmDialog` lacks `children`), `ConfirmDialog` (delete), `Sheet`, `EmptyResult`, `Result`, and `Pagination`.

---

## 5. Implementation Milestones (M1–M4)

### Milestone M1: `@openboa/yogurt@0.2.0-local.1` Upgrade, Setup Remediation & Global Shell
- **Goal:** Upgrade the monorepo to `@openboa/yogurt@0.2.0-local.1` (with bundled `@ui-sdk/*`), bring all 4 surfaces including `apps/web/src/app` under `yogurt check`, fix RSC client boundaries and per-entry imports in the global shell and shared `packages/ui`, align `material="neutral"` + `appearance` switcher, enforce `0.2.0` monochrome/`tone="brand"`/flat-hairline discipline, and replace the misused `AgentAvatar` brand mark.
- **Target Files:**
  - `vendor/openboa-yogurt-0.2.0-local.1.tgz`, `package.json`, `packages/ui/package.json`, `packages/mcp-apps/package.json`, `apps/web/package.json`, `package-lock.json`, `README.md`
  - `yogurt.config.json`
  - `packages/ui/src/styles.css`, `packages/ui/src/*.tsx`
  - `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
  - `apps/web/src/components/NavHeader.tsx` (and new shell/theme client wrapper using `Navbar` / `NavigationList`)
- **Dependencies:** None (first milestone).
- **Verification Gate:** `npm run check:yogurt` exits `0` reporting all 4 surfaces and `Yogurt 0.2.0-local.1`; `packages/ui/src/*`, `apps/web/src/app/{layout.tsx,globals.css}`, and `apps/web/src/components/NavHeader.tsx` contain zero `.cc-*` classes and zero `<Link><Button>` nesting; `npm run typecheck`, `npm run build:mcp-apps`, and `npm run build` succeed. (Codebase-wide `.cc-*` and `<Link><Button>` elimination completes in M3 when all `apps/web/src/components/*` and `sources/page.tsx` are rebuilt.)

### Milestone M2: Deterministic Core Insights, Pagination & Shelf/Stance Hydration
- **Goal:** Implement all additive read/aggregation/pagination/Shelf-hydration helpers in `packages/core` without altering the 15-table schema or privacy invariants.
- **Target Files:**
  - `packages/core/src/types.ts`
  - `packages/core/src/services/beans.ts` (`getPersonalInsights`, `listBeansPage` / extended `listBeans` filters with non-owner public-endpoint `lifecycleState` relation guard, `listPublicSources` / `listPublicPeople` search + pagination, `getViewerStanceForOrigin` returning `null` on empty `viewerId`)
  - `packages/core/src/services/shelf.ts` (`ShelfEntryView.bean.firstSourceOriginId` derived from `rev.originsJson` while `visibility === 'public'`, plus browse `{ targetType, targetId, shelfItemId }` hydration shape)
  - `packages/core/test/core.test.ts`
  - `apps/web/src/app/api/beans/route.ts`, `apps/web/src/app/api/insights/route.ts`
- **Dependencies:** Independent of M1 (can run in parallel with M1).
- **Verification Gate:** `npm run test:core` passes including new deterministic tests verifying `getPersonalInsights` accuracy (mutually exclusive `lifecycle` precedence, non-exclusive `originMix` presence counts, live `shelfCount`), pagination & non-owner `lifecycleState` public-endpoint relation guard, `ShelfEntryView.bean.firstSourceOriginId`, `getViewerStanceForOrigin` returning `null` for null/empty `viewerId`, and **zero private leakage** in `getPersonProfile`, `getSourceCompare` (`404` on private-only URLs), `listPublicSources`, and `listPublicPeople`.

### Milestone M3: Personal Workflow, Sharing Matrix & Insights Web Rebuild
- **Goal:** Rebuild all web screens around the 3 redesigned pillars using verified `@openboa/yogurt@0.2.0-local.1` primitives, the Two-Tier Coffee Chat dual-label vocabulary (**Bean / Roast / Brew / My Roastery / Tasting Notes / Shelf / Tables / Roast Log** paired with subtle plain-language sub-labels via `PageHeader.detail`, `SidebarItem.description`, `Card.description`, `ListHeader.detail`, `ListRow.description`, `StatCard.detail`, and form `help`), progressive 2-stage multi-origin Roast in `Sheet` with segmented `Progress`, Roast Log & relation resolution, `Dialog` + `Checkbox` redaction modal, Tasting Notes (`StatCard`, `Chart`, `Progress`, `RecordFacts`), Axis-by-Axis Table Comparison, live-hydrated `{ targetType, targetId, shelfItemId }` Shelf, explicit Better Auth `/api/auth/link-social` + `isTestAuthEnabled()`-gated `POST /api/accounts`, `returnTo` hardening, SSR `Cache-Control: private, no-store`, unseeded `/` onboarding, and live Brew readiness status.
- **Target Files:**
  - `apps/web/src/lib/auth.ts` (`accountLinking: { enabled: true, disableImplicitLinking: true, trustedProviders: ["github", "google"], allowDifferentEmails: true }`)
  - `apps/web/src/app/api/accounts/route.ts` (gate unverified JSON `POST` to `isTestAuthEnabled()`)
  - `apps/web/src/app/page.tsx` & `HomeClient.tsx` (`Cache-Control: private, no-store`)
  - `apps/web/src/app/me/page.tsx` & `WorkspaceClient.tsx` (replacing `RoasteryClient.tsx`), `QuickCaptureSheet.tsx` (replacing 9-field `QuickCaptureForm.tsx`), `InsightsPanel.tsx`, `AgentHandoffDialog.tsx`
  - `apps/web/src/app/sources/page.tsx`, `apps/web/src/app/sources/[id]/page.tsx` & `SourceCompareClient.tsx` (`Cache-Control: private, no-store`)
  - `apps/web/src/app/u/[handle]/page.tsx` & `PersonClient.tsx` (`Cache-Control: private, no-store`)
  - `apps/web/src/app/connect/page.tsx` & `ConnectClient.tsx` (`Cache-Control: private, no-store`)
  - `apps/web/src/app/signin/page.tsx` & `SignInPanel.tsx` (`returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")`)
  - `apps/web/src/app/oauth/consent/page.tsx` & `ConsentClient.tsx` (`Cache-Control: private, no-store`)
  - `packages/ui/src/{BeanCard,BeanPicker,ConfirmBeanCard,PerspectiveDiffCard}.tsx` (aligned with Two-Tier Coffee Chat dual-label terminology and Yogurt primitives)
- **Dependencies:** M1 and M2.
- **Verification Gate:** `npm run check:yogurt`, `npm run typecheck`, `npm run test:web`, `npm run test:mcp-apps`, and `npm run build` all pass; **codebase-wide zero `.cc-*` classes and zero `<Link><Button>` markup** remain across the entire repository; zero MCP function names (`list_beans`, `compare_perspectives`, `prepare_bean`, `scope=`) appear in UI copy or handoff prompt strings.

### Milestone M4: Live Auth, Expanded E2E Suite & Final Qualification
- **Goal:** Upgrade `e2e/coffee-chat.spec.ts` and `playwright.config.ts` to verify every criterion in [docs/acceptance/first-loop/spec.md](../../acceptance/first-loop/spec.md), verify staging/live OAuth readiness, and validate `evals/` + hygiene checks.
- **Target Files:**
  - `playwright.config.ts` (support testing both unseeded `/` and seeded flows cleanly)
  - `e2e/coffee-chat.spec.ts`
  - `docs/status.md` (updated with post-build verification evidence)
- **Dependencies:** M3.
- **Verification Gate:**
  - `npm test` (`test:core`, `test:mcp-apps`, `test:web`, `test:evals`) exits `0`.
  - `npm run check:yogurt` exits `0` across all 4 surfaces.
  - `npm run test:e2e` exits `0` covering: unauthenticated `returnTo` redirect, test-auth login/logout, explicit provider unlink guard, 2-stage multi-origin capture, revision timeline + tension resolution, `409 VERSION_CONFLICT` recovery, Personal Insights accuracy, `work_episode` `400 REDACTION_REQUIRED` gate, `/sources/[id]` axis matrix + owner private stance + incognito `404`/isolation, live Shelf persistence across reloads, unseeded `/` onboarding, OAuth consent `/oauth/consent` + grant revocation, 3 MCP App bundles, and desktop/mobile light/dark rendering.
  - `git diff --check`, secret scanning, and `npm run build` all exit `0`.
