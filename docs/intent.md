# Coffee Chat product intent

**Status:** Accepted MVP product intent — redesigned around personal workflow, sharing perspectives, and deterministic insights (2026-11-24). See [docs/ux-plan.md](ux-plan.md), [docs/spec.md](spec.md), [docs/engineering/mvp-redesign/spec.md](engineering/mvp-redesign/spec.md), and [docs/status.md](status.md).

## Why Coffee Chat exists

Knowledge is shared, but sensemaking is personal. Two people can read the same source or face the same engineering or product decision and validly emphasize different details, weigh different trade-offs, and set different boundaries.

In AI-assisted work, models routinely produce fluent, factually accurate answers that miss what a person actually optimizes for—forcing the person to repeat the same corrections across tasks and tools. Meanwhile, bookmarking links or reading someone else's public posts rarely reveals *what mattered most to them*, *what they chose to sacrifice*, or *when their judgment stops applying*.

## Product promise: Three connected pillars

Coffee Chat lets a person capture how they made sense of a source or a real work decision as an **author-confirmed Bean**—preserving the supporting origin(s), their take, their priority trade-off, and their boundary—and puts those records to work across three cohesive pillars:

1. **Personal Judgment Workflow (`My Roastery` · *Personal judgment workspace*)**
   - **Natural accumulation (`Roast`):** Judgment accumulates seamlessly while reading (`source_excerpt`) or making real calls at work (`work_episode`), via either connected AI hosts or a progressive low-friction Roast flow on the web.
   - **Living workspace (`/me`):** Rather than a flat list of static cards, a person organizes confirmed Beans by decision domain (`tags`), origin type, and lifecycle state (`Active`, `In Tension`, `Superseded`, `Private`), inspects immutable revision history (**Roast Log** · `bean_revisions`), and resolves evolving thinking through explicit relations (`supersedes`, `refines`, `tensions_with`).
   - **Work (`Brew`):** Connected AI hosts bring relevant confirmed Beans (the owner's own records plus any public records explicitly saved on their **Shelf**) into new decisions—shaping concrete trade-offs, attributing which record influenced which choice, and withholding application outside its stated boundary.

2. **Sharing & Comparing Perspectives (`Tables` & `Shelf` · *Compare takes & save voices*)**
   - **Purposeful shared Tables (`/sources` & `/sources/[id]`):** Every shared source URL forms a comparison Table where visitors read differing author-confirmed Beans side by side along explicit axes—the origin quote, each person's take, what they prioritized (`tradeoff`), and when it stops applying (`boundary`)—while signed-in owners see whether they also hold a private or public Bean on that same source.
   - **Talk (Coffee Chat) & Live Shelf (`/@[handle]` & `Shelf`):** Visitors browse public author profiles with aggregate `public` and `private` activity counts, follow voices or individual Beans via live-hydrated **Shelf** references (`shelf_items`), and Brew those perspectives in their own AI host without impersonation.

3. **Deterministic Stats & Insights (`Tasting Notes` · *Personal stats & insights*)**
   - **Owner-only Tasting Notes (`/me?tab=insights`):** Zero-AI deterministic SQL/TypeScript aggregates help a person see how their judgment is accumulating and evolving: total Beans (`Private` vs `On the Table`), reading vs work origin balance, AI-Roasted (`agent_attested`) vs Web-Roasted (`ui_attested`) split, top decision domains (`tags`), Roast Log and refinement momentum, unresolved tensions needing attention, connected AI host status (`oauth_grants`), and Shelf composition.
   - **Privacy-safe public aggregates (`/@[handle]` & `/sources/[id]`):** Public views summarize contributor activity and topic coverage strictly over `visibility = 'public'` records (plus the invariant `publicCount` and `privateCount` counts on author pages), never leaking private content, private origins, private relation edges, or unbacked telemetry.

## Why the initial reskin (`5015314`) was insufficient

Commit `5015314` renamed surface labels (`My Table`, `Tables`, `Saved Voices`) and added a 9-field capture form and clipboard prompt dialogs, but left the underlying product loop broken:
- `/me` remained a flat search list that hid revision history (`bean_revisions`), offered no tension/supersession resolution flow, and provided zero personal insights.
- Capture required a heavy 9-field single-origin form up front instead of progressive capture from spark to confirmed judgment.
- AI integration was simulated via clipboard snippets containing raw MCP tool syntax rather than surfacing live connected AI host status (`oauth_grants`) and plain-language handoffs.
- Saved Shelf state failed to hydrate on browse pages, explicit provider account-linking UI was absent, and unseeded production `/` rendered empty.

The redesigned UX/IA in [docs/ux-plan.md](ux-plan.md) resolves every one of these gaps on top of the preserved backend, privacy, and OAuth 2.1 MCP foundation.

## Core invariants

1. **Author confirmation is mandatory.** AI may propose a structured candidate from reading or a work correction, and the web flow may scaffold a quick spark, but nothing is persisted without explicit owner confirmation of the exact normalized content, origins, and visibility.
2. **Private by default.** Every newly confirmed Bean defaults to `private`. Public profile pages show aggregate `public` and `private` counts only; private Bean contents, origins, titles, tags, timestamps, relation edges, and individual ID existence are never exposed to non-owners.
3. **Facts, interpretation, and authority stay separate.** Origins (URL excerpts or owner-confirmed work episode summaries) remain distinct from the author's take. A Bean informs reasoning; it never grants tool execution authority or overrides factual accuracy and user instructions.
4. **Living, non-impersonating Taste.** Beans evolve through explicit revisions and relations (`supersedes`, `refines`, `tensions_with`) rather than silent overwrite or hidden personality inference. Agents disclose that they are consulting confirmed records and never impersonate the author.
5. **Zero-AI server.** All AI reasoning happens in the user's chosen agent host via universal Agent Skills (`SKILL.md`) and remote OAuth 2.1 MCP + MCP Apps. The web and MCP service owns identity, deterministic search, deterministic aggregation, storage, relations, privacy boundaries, and interactive UI payloads—with zero server-side model calls.

## Convincing failure

Coffee Chat has **failed** if:
- A user accumulates confirmed Beans yet sees only a static card list or clipboard prompt modals—never seeing how their criteria evolved, where tensions remain unresolved, or whether an AI host is actually connected.
- Brew only imitates tone or appends generic commentary without altering actual decisions and trade-offs on a new task.
- An agent silently saves inferred preferences or pushes a past judgment past its stated boundary.
- Private work context, private-only origins, private relation edges, or unbacked telemetry leak through public profiles, shared tables, stats aggregates, or unauthorized ID lookups.
- A user must fight a 9-field monolith upfront or an empty unseeded home page instead of moving smoothly from spark → confirmation → insight → AI application and shared comparison.

## First proof

The first demonstrable outcome is defined across [the UX/IA blueprint](ux-plan.md), [the technical specification](spec.md), [the MVP redesign engineering spec](engineering/mvp-redesign/spec.md), and [First Loop acceptance](acceptance/first-loop/spec.md): authenticating via Better Auth (or deterministic non-production test auth), accumulating and evolving personal judgment with deterministic stats/insights, sharing and comparing perspectives on a live-hydrated Zero-AI `@openboa/yogurt` web app with strict privacy boundaries, connecting an external AI host via OAuth 2.1 MCP + 3 MCP Apps, and verifying on an independent evaluation harness that A-conditioned and B-conditioned Brew outputs diverge faithfully in concrete trade-offs while withholding out-of-boundary application.
