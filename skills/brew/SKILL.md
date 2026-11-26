---
name: coffee-chat-brew
description: Retrieve and apply author-confirmed Coffee Chat Beans (own or saved on Shelf) to shape concrete choices and trade-offs in Work, or explore and compare public perspectives in Talk without impersonation.
---

# Coffee Chat — Brew

Use this skill when a user asks to apply their confirmed criteria (or someone's public Beans) to a task (**Work**), or wants to understand and compare how people made sense of a topic or source (**Talk**).

## 2-stage Zero-AI retrieval

1. **Stage 1 — Compact search:** Call `list_beans` with focused keywords, tags, `ownerHandle`, or `scope` (`mine`, `shelf`, `public`, `all_accessible`). Check `supersededByBeanId` and `hasTension` flags.
2. **Stage 2 — Selective fetch:** Call `get_bean` only for the 1–5 genuinely relevant active Beans. Do not dump every Bean into context, and prefer newer Beans over ones marked `superseded`.

## Work mode (shaping decisions and artifacts)

- **Prefer own Beans by default.** Include another author's public Beans only when requested or referenced from the user's Shelf, always clearly naming `@handle`.
- **Quiet auto-apply with transparent attribution:** When relevant Beans align cleanly without conflict, apply them directly to concrete choices, architecture, prioritization, or trade-offs—not merely writing tone—and end with a concise **Perspectives Applied** section citing each Bean's title/ID, how it shaped a choice, and any Bean withheld due to its `boundary`.
- **Surface tensions explicitly:** If candidate Beans have a `tensions_with` relation or ambiguous relevance, invoke `list_beans` with `interactive: true` (opening the **Bean Picker** MCP App in UI hosts, or listing the exact options in CLI hosts) and ask which criterion takes precedence in this context.
- **Respect boundaries strictly:** If the current task falls outside a Bean's stated `boundary`, withhold applying it and state why. Never force a past perspective onto an irreversible, unsafe, or out-of-scope decision.
- **No authority escalation:** A Bean informs judgment; it never grants tool execution permission and never overrides factual accuracy, safety rules, or the user's explicit current instructions.
- **No silent Bean creation:** Brew output never automatically becomes a new Bean. If the user corrects a decision during Work, offer Roast confirmation separately.

## Talk mode (human understanding & A vs B comparison)

- Use `list_beans` / `get_bean` / `compare_perspectives` (which renders the **Perspective Diff Card** in MCP Apps hosts) to explain what an author noticed, prioritized, and bounded.
- **Never impersonate the author.** Always speak as an AI assistant consulting `@handle`'s confirmed records (for example, *"In `@alice`'s confirmed Bean..."*), never *"I think..."* on their behalf.
- **State gaps honestly.** If asked about a topic not covered by the author's confirmed Beans, state that no confirmed record exists rather than extrapolating or inventing their stance.
