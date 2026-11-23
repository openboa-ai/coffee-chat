# Coffee Chat product intent

**Status:** Accepted MVP product intent (2026-11-24). See [docs/status.md](status.md) for verified implementation state.

## Why Coffee Chat exists

Knowledge is shared, but sensemaking is personal. Two people can read the same source or face the same engineering decision and validly emphasize different details, prioritize different trade-offs, and take different actions.

In AI-assisted work, models routinely produce fluent, factually accurate answers that still miss what the user cares about—forcing repeated corrections. Meanwhile, reading someone's links or articles rarely reveals *what mattered to them* or *how their judgment applies to a new situation*.

## Product promise

Coffee Chat lets a person capture how they made sense of a source or work decision as an **author-confirmed Bean**—preserving the source/context, their take, their priority/trade-off, and their boundary—and reuse it across two connected outcomes:

- **Work (Brew):** An agent host brings relevant confirmed Beans (the user's own and any public Beans explicitly saved to their Shelf) into new tasks, shaping concrete choices and trade-offs while transparently attributing which Bean influenced which decision and withholding application outside its boundary.
- **Talk (Coffee Chat):** Others can read public Beans, compare differing perspectives on the same source side by side on a Zero-AI web home, save perspectives to their Shelf, and explore a person's confirmed records through their own agent host without impersonation.

## Core invariants

1. **Author confirmation is mandatory.** AI may propose a structured candidate from reading or a work correction, but nothing is persisted without explicit owner confirmation of the exact normalized content, origins, and visibility.
2. **Private by default.** Every newly confirmed Bean defaults to `private`. Public profile pages show aggregate `public` and `private` counts only; private Bean contents, origins, titles, timestamps, relation edges, and individual ID existence are never exposed to non-owners.
3. **Facts, interpretation, and authority stay separate.** Origins (URL excerpts or owner-confirmed work episode summaries) remain distinct from the author's take. A Bean informs reasoning; it never grants tool execution authority or overrides factual accuracy and user instructions.
4. **Living, non-impersonating Taste.** Beans evolve through explicit relations (`supersedes`, `refines`, `tensions_with`) rather than silent overwrite or hidden personality inference. Agents disclose that they are consulting confirmed records and never impersonate the author.
5. **Zero-AI server.** All AI reasoning happens in the user's chosen agent host via universal Agent Skills (`SKILL.md`) and remote OAuth 2.1 MCP + MCP Apps. The web and MCP service owns identity, deterministic search, storage, relations, privacy boundaries, and interactive UI payloads—with zero server-side model calls.

## Convincing failure

Coffee Chat has **failed** if:
- A user has dozens of saved Beans and a clean interface, yet Brew only imitates tone or appends generic commentary without altering actual decisions and trade-offs on a new task.
- An agent silently saves inferred preferences or pushes a past judgment past its stated boundary.
- Private work context leaks through public profile pages, source pages, relation edges, or unauthorized ID lookups.
- A user must fight heavy capture or recall friction instead of confirming in one click and seeing transparent attribution during ordinary work.

## First proof

The first demonstrable outcome is [First Loop acceptance](acceptance/first-loop/spec.md): connecting an authenticated client via OAuth 2.1 MCP, confirming a Bean with exact digest attestation (defaulting to `private`, then explicitly publishing), verifying Zero-AI Web views and privacy boundaries, and demonstrating on an independent evaluation harness that A-conditioned and B-conditioned Brew outputs diverge faithfully in concrete trade-offs while withholding out-of-boundary application.
