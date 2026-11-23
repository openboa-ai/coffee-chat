# First Loop Acceptance Specification

**Status:** Active MVP acceptance contract (2026-11-24).

## Goal

Demonstrate the shortest complete Coffee Chat loop end to end against a real Postgres engine (PGlite locally, Neon-compatible schema), real OAuth 2.1 MCP Server, real MCP Apps HTML bundles, Zero-AI Yogurt Web Home, and independent Taste evaluation harness.

## Observable Acceptance Criteria

### A. Core Domain, Privacy & Concurrency (Deterministic — PGlite)
1. **Default Private & Exact Digest:** Calling `prepare_bean` for both `source_excerpt` and `work_episode` returns `visibility: "private"`, normalized origins, RFC 8785 JCS SHA-256 `digest`, and `operationKey` without writing to DB. Calling `save_bean` with a tampered payload or mismatched `digest` fails (`DIGEST_MISMATCH`); calling with matching `digest` persists revision 1, version 1.
2. **Idempotency & Non-Resurrection:** Replaying `save_bean` with the same `(ownerId, operationKey, requestDigest)` returns the original Bean without duplicating rows; reusing `operationKey` with a different payload fails (`IDEMPOTENCY_CONFLICT`); deleting a Bean removes content/revisions while retaining a content-free receipt so replaying the prior write fails and never resurrects the Bean.
3. **Optimistic Concurrency:** Switching a Bean to `private` increments `version`; a stale mutation carrying the previous `expectedVersion` fails (`VERSION_CONFLICT`) and cannot re-publish the Bean.
4. **Aggregate Count Exposure vs Zero Leakage:** A user with 1 `public` Bean and 1 `private` Bean (plus a `refines` relation between them and a private-only URL origin) exposes `publicCount: 1, privateCount: 1` publicly, while non-owners receive `404` on the private Bean ID, zero private origins on Source Compare, and zero relation edges referencing the private Bean.
5. **Work Episode Public Redaction Guard:** Switching a `work_episode` Bean from `private` to `public` fails unless `redactionConfirmed: true` is explicitly passed.
6. **Living Taste Relations & Shelf:** `supersedes`, `refines`, and `tensions_with` persist with owner/cycle checks; Shelf saves a public Bean or `@handle` by live reference only and immediately stops returning it once the owner switches it to `private` or deletes it.

### B. OAuth 2.1 MCP & MCP Apps End-to-End
7. **Discovery & PKCE Flow:** Unauthenticated `/api/mcp` returns `401` with RFC 9728 `WWW-Authenticate` header. A real OAuth 2.1 client completes discovery, registration, Authorization Code + PKCE (`S256`), receives opaque access & refresh tokens, and calls `get_profile`, `prepare_bean`, `save_bean`, `list_beans`, `get_bean`, `manage_shelf`, and `compare_perspectives`.
8. **Instant Revocation:** Revoking the grant via Web/API immediately rejects both subsequent `/api/mcp` calls with the old access token and token refresh requests with the old refresh token. Re-consenting issues a new grant and never revives previously revoked tokens.
9. **MCP Apps Resources & CLI Fallbacks:** All 3 `ui://coffee-chat/*.html` resources serve valid self-contained `text/html;profile=mcp-app` bundles under 10 MiB; every tool returns both `content` (CLI Markdown fallback) and `structuredContent`.

### C. Zero-AI Web Home & Yogurt Compliance (Playwright + `yogurt check`)
10. **Browser Flows:** Automated Playwright tests verify Landing/Connect, login (test-only local adapter), My Roastery (create/toggle visibility/delete/export JSON & Markdown/revoke OAuth grant), Person Page (`publicCount` & `privateCount` visible, private content absent, Save to Shelf, Agent handoff), Source Compare (A vs B side by side), and interactive rendering of all 3 MCP App bundles (`Confirm Bean Card`, `Bean Picker`, `Perspective Diff Card`).
11. **Design System Compliance:** `yogurt check` passes with zero errors across declared presentation surfaces.

### D. Skills, Independent Taste Eval & Build Readiness
12. **Skills & Eval Harness:** `skills/roast/SKILL.md` and `skills/brew/SKILL.md` validate cleanly; all 6 frozen scenarios in `evals/` pass deterministic contract/rubric checks; paired smoke comparison executes (or records explicit `not_run` with command when offline).
13. **Deploy-Ready Hygiene:** `next build` succeeds, Drizzle migration SQL generates cleanly for Neon Postgres, `git diff --check` passes, and secret scanning finds zero secrets.
