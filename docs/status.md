# Coffee Chat Status

**Last updated:** 2026-11-24
**Branch:** `codex/mvp-reboot`

This file distinguishes planned design from verified implementation. Every verified row corresponds to commands actually executed on the current revision.

| Area | Status | Verification Evidence |
| --- | --- | --- |
| Canonical docs (`intent`, `spec`, `first-loop`) | `verified` | Written on `codex/mvp-reboot`; clean `git diff --check` and external-reference check |
| Monorepo scaffold & `@openboa/yogurt` SDK pin | `verified` | `npm install` + `yogurt check` (`3 declared surfaces, 19 presentation files, Yogurt 0.1.0-local.15`) |
| `packages/core` domain, Postgres/PGlite & security | `verified` | `npm run test:core` (7/7 passed on PGlite); Neon SQL migration generated at `packages/core/drizzle/0000_modern_virginia_dare.sql` |
| `packages/ui` & `packages/mcp-apps` (3 widgets) | `verified` | `npm run build:mcp-apps` (`confirm-bean.html` 914 KiB, `bean-picker.html` 910 KiB, `perspective-diff.html` 753 KiB), `npm run test:mcp-apps` (1/1 passed), Playwright widget E2E passed |
| `apps/web` Better Auth + OAuth 2.1 `/api/mcp` + Zero-AI Web | `verified` | `npm run test:web` (OAuth 2.1 RFC 9728 / PKCE / `/api/mcp` / revocation passed), `npm run build` (27 routes compiled), Playwright full Web E2E passed |
| `skills/` (`roast`, `brew`, `plugin.json`) & `evals/` (6 scenarios) | `verified_deterministic` | `npm run test:evals` (9/9 passed, independence check + 6 frozen scenarios); `npm --workspace @coffee-chat/evals run smoke` (6/6 deterministic passed; `livePairedModelSmoke: not_run` offline without model API keys) |
| Full monorepo typecheck (`core`, `ui`, `mcp-apps`, `web`, `evals`) | `verified` | `npm run typecheck` exited 0 |
| Production Vercel / Neon deploy & live OAuth secrets | `deferred_for_approval` | External cloud deployment and live GitHub/Google OAuth credentials require explicit human approval and secret entry |
