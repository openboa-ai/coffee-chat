# Coffee Chat product repository rules

This repository owns the official Codex-first, Skills-only Coffee Chat Plugin.
The current bounded product implementation is Build mine / Init. Sync, Unsync,
Roast, Brew, Coffee Chat, and Coffee Blend remain explicit deferred surfaces.

## Product boundary

- Keep exactly seven public Skill names and matching directories: coffee-init,
  coffee-sync, coffee-unsync, coffee-roast, coffee-brew, coffee-chat, and
  coffee-blend. Coffee Init is available; the other six must return
  `not_implemented` without side effects. Internal machine-readable capability
  values remain init, sync, unsync, roast, brew, coffee-chat, and coffee-blend.
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

## Solo-agent change lifecycle

- Work on a non-default branch, open a pull request, and enable GitHub-native
  squash auto-merge only after the exact head passes the local verification
  contract and all required GitHub checks.
- The target repository exposes one inert `pull_request_target` wrapper pinned
  to the central reusable gate. That trusted gate accepts only `OWNER` or
  `MEMBER` authors and exact in-repository `dependabot[bot]`, with matching
  actor, pull-request author, and head repository. Do not add another target
  workflow or widen that set. Merge queue is disabled. Never add custom
  write-token merge automation.
- Mark the pull request's sensitive-path declaration accurately. The central
  classifier and repository ruleset—not the agent or candidate checkout—decide
  whether the protected `coffee-security` Environment must confirm it.
- Normal code, documentation, tests, and exact in-repository Dependabot package
  updates that pass the base policy remain eligible for native auto-merge.
  Changes to repository automation, security policy, hooks, external-write
  boundaries, or executable authority—including OWNER or MEMBER changes to
  `package.json` or `package-lock.json`—wait for the Environment confirmation.
- The reusable workflow in `openboa-ai/.github` is the authorization boundary.
  It loads controls and the YAML parser only from its own workflow SHA and this
  repository's base SHA, and treats the pull-request checkout as data. Local and
  candidate package scripts are post-trust quality checks, never authorization.
- On an author-controlled checkout, install the isolated parser explicitly with
  `node .github/policy-bootstrap.mjs && npm ci --ignore-scripts --prefix .github/policy-parser`
  before local policy tests. Never use that candidate command to decide whether
  an untrusted branch is safe.
- Reject root `.npmrc`, parser `.npmrc`, and `npm-shrinkwrap.json`; they are
  unsupported competing install authorities. Preserve trusted history, worktree,
  and raw-blob secret scanning in the central gate.
