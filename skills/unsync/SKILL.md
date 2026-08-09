---
name: unsync
description:
  Unsync one exact external Roastery relationship without claiming deletion of
  remote or host history. Use when the user asks to remove, disconnect, forget,
  or Unsync a registered Roastery.
---

# Unsync

Remove only one exact global Registry relationship.

## Input

Require the exact registered relationship ID. If the request is ambiguous, list
candidates without removing any.

## Steps

1. Resolve exactly one ID from the global Registry.
2. Run `scripts/run.mjs` with the current Registry and that ID.
3. Apply only the returned Registry deletion on a surface where the user
   approves that local write.

## Output

Return the removed relationship and the remaining Registry.

## Failure boundary

Unsync does not delete a remote, clone, host conversation history, archived
chat, or prior CC BY grant. Do not promise session-end cleanup or remove by a
partial URL/name match.

See [deletion-limits.md](references/deletion-limits.md).
