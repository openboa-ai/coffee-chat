# Coffee Chat Status

**Last updated:** 2026-11-24
**Branch:** `codex/mvp-reboot`

This file distinguishes planned design from verified implementation. Every verified row corresponds to commands actually executed on the current revision.

| Area | Status | Verification Evidence |
| --- | --- | --- |
| Canonical docs (`intent`, `spec`, `ux-plan`, `first-loop`) | `verified` | Written on `codex/mvp-reboot`; clean `git diff --check` and reference guard |
| Monorepo scaffold & `@openboa/yogurt` SDK pin | `verified` | `npm install` + `yogurt check` (`3 declared surfaces, 23 presentation files, Yogurt 0.1.0-local.15`) |
| `packages/core` domain, Postgres/PGlite, seed & security | `verified` | `npm run test:core` passed on PGlite; Neon SQL migration generated at `packages/core/drizzle/0000_modern_virginia_dare.sql` |
| `packages/ui` & `packages/mcp-apps` (3 widgets) | `verified` | `npm run build:mcp-apps`, `npm run test:mcp-apps`, Playwright widget E2E passed |
| `apps/web` Better Auth + OAuth 2.1 `/api/mcp` + Consumer Web Home | `verified` | `npm run test:web`, `npm run build`, Playwright full service E2E passed |
| `skills/` (`roast`, `brew`, `plugin.json`) & `evals/` (6 scenarios) | `verified_deterministic` | `npm run test:evals` (9/9 passed); `smoke` (6/6 deterministic passed; `livePairedModelSmoke: not_run` offline) |
| Full monorepo typecheck (`core`, `ui`, `mcp-apps`, `web`, `evals`) | `verified` | `npm run typecheck` exited 0 |
| Production Vercel / Neon deploy & live OAuth secrets | `deferred_for_approval` | External cloud deployment and live GitHub/Google OAuth credentials require explicit human approval and secret entry |
