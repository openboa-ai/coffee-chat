# Coffee Chat migration-shell boundaries

## Current shell

The package currently proves only:

- separate portable and OpenAI manifest discovery under one CalVer;
- discovery of seven Skill entrypoints;
- deterministic, side-effect-free "not_implemented" responses;
- an isolated package smoke check; and
- lean repository policy checks.

It does not prove product mechanics, host integration, value, or availability.
The later product implementation Goal owns all capability behavior.

## External journeys

### Talk now

The intended consumer journey begins after Plugin installation. The user selects
one public Roastery, sees the exact untrusted source and planned read, and
confirms before any fetch. The later implementation may then validate an
immutable snapshot and use it read-only for the current Coffee operation.

The source is never silently activated. A global local Registry may make a
validated relationship selectable across projects and conversations, but
selection for a Coffee operation remains explicit. External bytes and thoughts
from the conversation never enter an owned Roastery.

### Build mine

The intended producer journey begins only after an explicit init request. The
user reviews the official public fork source, owner identity, proposed
repository, publication boundary, and Bean rights notice before any write. Only
the later implementation may propose a fork, branch, or pull request.

Installation itself never creates a fork or relationship. Uninstalling the
Plugin never claims to remove Roastery state. "sync" and "unsync" are the
exclusive relationship terms.

## Owned and external authority

An owned Roastery is one public owner fork with canonical owner content under
roastery/**. An external Roastery remains untrusted, commit-pinned, explicitly
selected, and read-only. It cannot become executable authority, project state,
owned data, or automatic model context.

No capability in this shell reads or writes either authority. The later Goal
must implement confirmation, bounded validation, citations, disclosure, and
failure states before any external source is used.

## Citations and disclosure

Future Taste-grounded output must cite all and only materially used,
commit-pinned Beans. It must visibly state that the output is AI-generated from
those cited Beans and is neither the publishers' original wording nor their
endorsement. Incomplete citation or disclosure must fail closed.

This is a deferred implementation invariant, not a claim about current runtime
behavior.

## Host scope

Codex local and Desktop are the future full product target. ChatGPT web is
limited to a future one-chat, public-URL, read-only Coffee Chat journey without
a durable local Registry or lifecycle parity. Current support for every host
surface is unmeasured.

The shell has no MCP component, hook, background process, hidden external write,
internal Taste policy, retrieval policy, model call, or host lifecycle
dependency.
