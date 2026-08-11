# Coffee Chat product repository rules

This repository owns the official Codex-first, Skills-only Coffee Chat Plugin.
The current bounded product implementation is Build mine / Init. Sync, Unsync,
Roast, Brew, Coffee Chat, and Coffee Blend remain explicit deferred surfaces.

## Product boundary

- Keep exactly seven Skills: init, sync, unsync, roast, brew, coffee-chat, and
  coffee-blend. Init is available; the other six must return `not_implemented`
  without side effects.
- Keep portable root `plugin.json` and OpenAI `.codex-plugin/plugin.json` as
  separate projections of `config/plugin-metadata.json` under one CalVer.
- Plugin installation and discovery perform no fork, fetch, Registry, target, or
  publication operation.
- Init uses the vendored immutable Standard Roastery authority. Runtime must not
  import a sibling checkout, accept an alternate contract, or introduce a second
  executable pin.
- Before any external write, Init shows one digest-bound Preview containing the
  public target, exact declaration, seven notices, and rights attestation.
  Rejection, cancellation, invalid attribution, stale Preview, and failed
  preflight preserve zero GitHub and Registry writes.
- Accepted Init may fork only the frozen official public seed to
  `<owner>/coffee-chat`. Identity and `roastery/CONTENT_LICENSE.md` enter only
  through a protected branch and pull request. Register owned state only after
  the public default branch is reverified.
- The local GitHub adapter invokes `gh` without a shell. It never reads or emits
  credential material. Development tests use fake boundaries and never create a
  personal production fork.
- Add no MCP component, app, hook, embedded personal Roastery, external cache,
  evaluator, benchmark runtime, compatibility layer, sample Bean, or second
  release identity.
- Product vocabulary uses Taste, not persona. Official source is MIT with
  Openboa AI copyright; Bean content rights belong to the Roastery contract.
- Do not describe synthetic acceptance evidence as live host support, measured
  value, marketplace acceptance, or real-user performance.

## Verification

Run `npm run verify` and `git diff --check`. Package, build, smoke, and CI
scripts must not mutate a remote. Only the explicitly accepted Init Skill may
perform its documented user-scoped GitHub and Registry writes.
