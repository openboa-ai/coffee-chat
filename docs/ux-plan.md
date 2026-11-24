# Coffee Chat Service UX/UI Plan

**Status:** Active product UX blueprint (2026-11-24). Complements [docs/intent.md](intent.md) and [docs/spec.md](spec.md).

## Core UX Shift: From Protocol Console to a Real Coffee Chat Service

Security, privacy, RFC 8785 JCS attestation, optimistic locking, OAuth 2.1, and Zero-AI server invariants stay strictly enforced in `packages/core` and `apps/web/src/app/api/*`. The surface experience translates those guarantees into warm, human, low-friction product flows anyone wants to use:

1. **Zero protocol jargon on user surfaces.** Never show `Zero-AI Web`, `RFC 8785 digest`, `OAuth 2.1`, `work_episode`, `source_excerpt`, `operationKey`, or `expectedVersion` in everyday product copy. Translate to plain human meaning:
   - *Something I read* vs *A call I made at work*
   - *What it meant to you* (`take`) · *What mattered more* (`tradeoff`) · *When it doesn't apply* (`boundary`)
   - *Updated my mind* (`supersedes`) · *Builds on* (`refines`) · *In tension with* (`tensions_with`)
   - *My Table* (`/me`) · *Saved Voices* (Shelf) · *Tables* (`/sources`) · *Use with AI* (`/connect`)
2. **Alive on the first second.** The home screen leads with a real side-by-side **Same Read, Different Takes** comparison, filterable public perspectives, and real Voices with aggregate `public` + `private` activity counts—never a blank admin dashboard.
3. **10-second capture, 1-click save.** Replace multi-step form bureaucracy with a single conversational capture card accessible from Home, Source Compare (pre-filled with that URL), and My Table. Behind the scenes, clicking **Save perspective** atomically executes `prepare_bean` → exact JCS digest → `save_bean`, keeping every cryptographic and privacy guarantee intact.
4. **Clear separation between everyday use and technical settings.** `/me` splits cleanly into three Yogurt tabs: **My Takes**, **Saved Voices**, and **AI & Settings** (where MCP grants, OAuth revocation, linked logins, and JSON/Markdown exports live without cluttering daily thinking).
5. **Actionable AI handoff everywhere.** Every shared table, person page, and Saved Voices shelf offers a one-click **Open in My AI** dialog with ready-to-copy **Talk** (explore without impersonation) and **Work** (apply trade-offs to a real task) prompts, paired with a 30-second host switcher on `/connect`.
