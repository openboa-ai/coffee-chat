# Coffee Chat Status

**Last updated:** 2026-11-24
**Branch:** `codex/mvp-reboot`

This file separates **verified implementation** (on commit `5015314`) from **planned redesign targets** (governed by [docs/ux-plan.md](ux-plan.md), [docs/spec.md](spec.md), [docs/acceptance/first-loop/spec.md](acceptance/first-loop/spec.md), and [docs/engineering/mvp-redesign/spec.md](engineering/mvp-redesign/spec.md)) and **approval-gated production items**.

| Area | Status | Verification Evidence / Target Scope |
| --- | --- | --- |
| Product, UX/IA & Engineering Redesign Specs (`intent`, `ux-plan`, `spec`, `first-loop`, `mvp-redesign`) | `ready_for_review` (docs) | Authored on `codex/mvp-reboot`; `git diff --check` clean, zero application code modified |
| `packages/core` schema, JCS digest, privacy, OAuth 2.1 & seed | `verified` (baseline `5015314`) | `npm run test:core` passed on PGlite; Neon SQL migration at `packages/core/drizzle/0000_modern_virginia_dare.sql` |
| `packages/mcp-apps` (3 standalone HTML widgets) | `verified` (baseline `5015314`) | `npm run build:mcp-apps`, `npm run test:mcp-apps`, Playwright widget E2E passed on `5015314` |
| OAuth 2.1 `/api/mcp` & Better Auth / test-auth backend | `verified` (baseline `5015314`) | `npm run test:web` passed on `5015314` |
| `skills/` (`roast`, `brew`, `plugin.json`) & `evals/` (6 scenarios) | `verified_deterministic` | `npm run test:evals` (9/9 passed); `smoke` (6/6 deterministic passed; `livePairedModelSmoke: not_run` offline) |
| **M1:** `@openboa/yogurt@0.2.0-local.1` upgrade & setup remediation (pack/pin `0.2.0-local.1` + bundled `@ui-sdk/*`, `apps/web/src/app` in `yogurt.config.json`, verified per-entry imports + client boundaries, `ProjectMark` fallback, remove `.cc-*` & `<Link><Button>` across `packages/ui` + `NavHeader`/`layout`, `material="neutral"`, `appearance` toggle, `0.2.0` monochrome/`tone="brand"` calibration) | `planned` | Currently pinned to `0.1.0-local.15` checking 3 surfaces (`packages/ui/src`, `packages/mcp-apps/src`, `apps/web/src/components`); tracked in `docs/engineering/mvp-redesign/spec.md` §M1 |
| **M2:** Core deterministic insights & query extensions (`getPersonalInsights`, server-backed pagination & lifecycle filters with public-endpoint relation guard, `ShelfEntryView.bean.firstSourceOriginId` & `{ targetType, targetId, shelfItemId }` hydration, owner-private stance helper) | `planned` | Tracked in `docs/engineering/mvp-redesign/spec.md` §M2 & `docs/spec.md` §3.2 |
| **M3:** Redesigned Web UX/IA rebuild (Two-Tier Coffee Chat dual-label vocabulary + subtle sub-labels, 2-stage multi-origin Roast, `/me` My Roastery + Roast Log + relations + Tasting Notes + Shelf + explicit account linking, `/sources/[id]` Table axis matrix, unseeded `/`, jargon-free Brew handoffs) | `planned` | Supersedes commit `5015314` flat UI reskin; tracked in `docs/engineering/mvp-redesign/spec.md` §M3 |
| **M4:** Expanded Playwright E2E & full qualification (`returnTo`, `VERSION_CONFLICT`, `REDACTION_REQUIRED`, `LAST_LOGIN_METHOD`, OAuth consent/revocation, live Shelf, insights, light/dark & mobile) | `planned` | Supersedes `5015314` 2-test E2E scope; tracked in `docs/acceptance/first-loop/spec.md` & `docs/engineering/mvp-redesign/spec.md` §M4 |
| Production Vercel / Neon deploy & live GitHub/Google OAuth secrets | `deferred_for_approval` | External cloud deployment and live OAuth credentials require explicit human approval and secret entry |
