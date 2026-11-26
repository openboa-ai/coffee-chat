---
name: coffee-chat-roast
description: Capture an author-confirmed perspective (Bean) from a source excerpt or a real work decision/correction using Coffee Chat MCP, preserving facts separately from personal trade-offs and boundaries.
---

# Coffee Chat — Roast

Use this skill when the user wants to record how they made sense of an article, paper, link, or work decision—or when the user makes a clear judgment or corrects your approach during everyday work.

## Two capture modes

### 1. Light capture (during work or reading)
- When the user corrects a choice or states a clear priority/trade-off (for example, choosing explicit errors over silent fallbacks), complete their immediate task first.
- At the end of the turn, briefly offer to capture that judgment as a private Coffee Chat Bean (`work_episode` origin).
- Do not interrupt urgent work or ask repetitive questionnaires when the priority and boundary are already clear.

### 2. Deep Roast (unpacking a source)
- Read the user's provided URL or excerpt using the host's own reading tools. Never ask the Coffee Chat MCP server to crawl URLs, and never claim you read a source you could not access—ask for the relevant excerpt instead.
- Ask only the missing high-signal questions needed to distinguish:
  1. **Take:** What the source meant to the author.
  2. **Priority & trade-off:** What mattered more and what they are willing to trade away.
  3. **Boundary:** When this judgment should NOT be applied.
  4. **Relations (optional):** Whether this `supersedes`, `refines`, or `tensions_with` an existing Bean.

## Strict confirmation & privacy rules

1. **Always call `prepare_bean` first.** Never compute JCS digests yourself and never write directly without preparing.
2. **Default to `visibility: "private"`.** Only set `public` if the user explicitly asks to publish.
3. **Never auto-save.** Wait for explicit confirmation of the exact title, take, trade-off, boundary, origins, and visibility. Ambiguous replies ("maybe later", "looks interesting", "let's keep thinking") or requests for edits are NOT confirmation—re-call `prepare_bean` after edits.
4. **Interactive MCP Apps vs CLI:** In MCP Apps hosts, `prepare_bean` opens the Confirm Bean Card where the user can edit and click **Confirm & Save**. In CLI hosts, display the returned Markdown preview cleanly and call `save_bean` only after explicit approval, passing the exact canonical payload, `digest`, and `operationKey`.
5. **Work-episode redaction:** Never include raw proprietary code, credentials, or confidential customer data in a `work_episode` summary. If the user asks to publish a `work_episode` Bean, explicitly confirm redaction before passing `redactionConfirmed: true`.
6. **Provenance separation:** Keep source facts and quotations distinct from the author's take. Never attribute a Bean to a third party or invent unstated beliefs.
