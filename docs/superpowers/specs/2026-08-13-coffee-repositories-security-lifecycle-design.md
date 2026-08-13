# Coffee Repositories Security Lifecycle Design

- **Date:** 2026-08-13
- **Scope:** `openboa-ai/coffee-chat`, `coffee-chat-roastery`,
  `coffee-chat-eval`, and `coffee-chat-bench`
- **Decision:** Trusted central path classification, protected Environment
  confirmation, and GitHub-native automatic merge

## Objective

Operate the four public Coffee repositories safely with one human maintainer and
an organization-member development agent. Normal changes should merge
automatically after deterministic security and quality checks pass. Only changes
to narrowly defined security-governance or external-side-effect boundaries
should wait for one human review.

The hardening rollout itself is authorized to complete without a separate user
confirmation. Future sensitive changes still pause at the protected
`coffee-security` Environment before the central aggregate can succeed.

## Considered approaches

### 1. Global approval for every pull request

This is simple, but makes the human maintainer a queue for documentation, tests,
and routine dependency updates. It does not match the requested autonomous agent
lifecycle.

### 2. Candidate-controlled workflow environment approval

A normal `pull_request` workflow can detect paths and pause on an Environment,
but its definition is candidate-controlled. A candidate can remove the gate or
manufacture the expected status, so this is not an authorization boundary.

### 3. Immutable central gate plus protected Environment

This is the selected design. Each target repository exposes one minimal
`pull_request_target` wrapper pinned to a full commit SHA in
`openboa-ai/.github`. The reusable workflow, target base policy, and parser are
immutable for the run; the pull-request head is data. A trusted classifier sends
protected-path or policy-evolution changes to `coffee-security`, while routine
changes skip the Environment. The repository ruleset requires only the exact
central aggregate, so native squash auto-merge resumes after the applicable
lanes succeed.

## Actors and authority

- `openboa` remains an organization member and is the expected author for agent
  pull requests.
- `dependabot[bot]` is the only additional machine identity admitted for its
  GitHub-authored dependency pull requests.
- `SonSangjoon` is the required reviewer for the `coffee-security` Environment.
  `prevent_self_review` is disabled because this is a solo-maintainer lifecycle;
  the pause still requires an explicit human action for sensitive changes.
- `security-maintainers` remains CODEOWNERS defense in depth, not a repository
  ruleset approval requirement or a substitute for the Environment.
- The rulesets retain no bypass actors. Changes use pull requests and squash
  merge; direct updates, deletions, and non-fast-forward updates to `main` stay
  blocked.
- No workflow receives a write token for merging. GitHub-native auto-merge owns
  the final squash after the required aggregate succeeds.

## Pull request lifecycle

1. An agent works on a non-default branch, runs repository-local verification,
   opens a pull request, and enables GitHub-native squash auto-merge.
2. The pinned target wrapper calls the central reusable gate from an immutable
   organization-controls SHA.
3. The gate authenticates the target base parser, rejects competing npm
   authorities and symlinks, scans history/worktree/raw blobs, classifies both
   sides of renames, and treats the candidate checkout as data until authorized.
4. Routine changes skip `coffee-security`; protected-path or exact-policy
   evolution waits for the Environment confirmation.
5. Trusted lanes perform dependency review, build-mode-none CodeQL,
   deterministic repository quality, and the isolated Eval Harbor calibration
   where applicable.
6. The fail-closed central aggregate is the repository ruleset's sole required
   check. GitHub performs the squash merge and deletes the branch.

Merge queue is intentionally disabled. Target repositories reject every other
`.yml` or `.yaml` workflow, so candidate code cannot define a competing status
or write-capable pull-request lane.

## Sensitive path policy

All repositories require the protected Environment confirmation for these shared
control surfaces:

- `.github/**/*`
- `.githooks/**/*`
- `AGENTS.md`
- `SECURITY.md`
- `CODEOWNERS`
- `.gitleaksignore`
- `.gitleaks.toml`

Additional repository-specific boundaries are intentionally narrow:

| Repository             | Additional sensitive paths                                                                                                                                                                                                                                                                                              | Reason                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `coffee-chat`          | `.agents/**/*`, `.codex-plugin/**/*`, `contract/**/*`, `runtime/**/*`, `scripts/**/*`, `skills/**/*`                                                                                                                                                                                                                    | Agent/plugin authority and executable package, GitHub, or Registry behavior       |
| `coffee-chat-roastery` | `dist/**/*`, `scripts/**/*`, `src/**/*`, `contract/**/*`, `roastery/CONTENT_LICENSE.md`, `roastery/roastery.json`, `LICENSE`, `tsconfig.json`, `tsconfig.build.json`                                                                                                                                                    | Published executable output, source, content authority, and build contract        |
| `coffee-chat-eval`     | `integrations/harbor/**/*`, `evals/**/*`, `src/benchmark-smoke.ts`, `src/canary-cli.ts`, `src/harbor.ts`, `src/pcda-cli.ts`, `src/pcda-receipt.ts`, `src/pcda-resources.ts`, `src/protocol-canary.ts`, `src/registry.ts`, `src/runner.ts`                                                                               | External execution, verifier, calibration, receipt, and registry boundaries       |
| `coffee-chat-bench`    | `config/judges/**/*`, `harbor/**/*`, `schemas/judge-campaign.schema.json`, `src/bank.ts`, `src/bounded-fs.ts`, `src/cli.ts`, `src/contracts.ts`, `src/digest.ts`, `src/identity.ts`, `src/judge-campaign.ts`, `src/judge-config.ts`, `src/judge-panel.ts`, `src/judgment.ts`, `src/openai-judge.ts`, `src/projector.ts` | Judge, attestation, resource, cost, projection, and external execution boundaries |

Package manifests are not manually gated. The dependency review action, lockfile
install, audit, type/build/test gates, and structural policy contract provide
the automated boundary for dependency changes. Major routine version updates are
suppressed from Dependabot version-update churn; security updates remain enabled
and compatible minor/patch updates are grouped.

## Repository-local security contract

Each repository has a structural policy test that rejects policy bypasses
instead of relying on regular expressions. It checks at least these invariants:

- `.github/workflows` contains only the exact inert wrapper, and its reusable
  workflow reference and `control_sha` are the same full commit SHA;
- future `.yml` and `.yaml` workflows are rejected;
- package scripts, publication metadata, lock registry/integrity, protected
  paths, and the central aggregate identity cannot silently drift;
- root/parser `.npmrc` and `npm-shrinkwrap.json` are unsupported competing
  installation authorities;
- Dependabot permits security updates and compatible minor/patch version updates
  without allowing routine major churn;
- bounded YAML parsing rejects oversized, deeply nested, or excessive-alias
  Dependabot input before trusted-policy resource exhaustion.

The central workflow owns permissions, immutable action pins, checkout
credential handling, bounded timeouts, secret scanning, dependency review,
CodeQL, and fail-closed aggregation. Repository code may run only after trusted
authorization.

## Coffee Init downstream fork boundary

Coffee Init also creates a user-owned Roastery fork, where organization teams
are unavailable and the authenticated sole owner cannot approve their own pull
request. That generated repository therefore uses a strict-check boundary and
hands off target-specific ownership without direct default-branch writes:

- before the fork is created, Init verifies that the official default branch is
  the exact pinned seed; after creation it requires the fork snapshot to match
  that commit and fails closed instead of moving `main`;
- the owner is assigned only to workflow, security policy, executable code,
  contract, and ownership-control paths; normal Bean metadata/content paths
  remain outside the manual gate;
- the branch ruleset retains zero approvals and does not require impossible
  author self-review; strict trusted checks remain mandatory;
- the initial digest-bound Init pull request changes the target-owner
  `CODEOWNERS` plus the two approved identity/license files and remains eligible
  for automatic merge;
- required checks include the trusted secret boundary and the CodeQL job, not
  only candidate-controlled quality and dependency contexts;
- Actions are selected-only with full-SHA pinning and read-only default workflow
  permissions instead of allowing every action.

This prevents candidate-workflow substitution and default-branch rewriting in
personal forks without pretending that a sole author can supply an independent
review or that an organization team exists in a user-owned repository.

## GitHub-native controls

For every repository:

- Actions stay selected-only, full-SHA-pinned, read-only by default, and unable
  to approve pull requests;
- secret scanning, push protection, Dependabot security updates, private
  vulnerability reporting, dependency graph, and automatic dependency submission
  remain enabled where the plan supports them;
- rulesets require the exact GitHub Actions identity of the central aggregate;
- the protected `coffee-security` Environment handles only classified sensitive
  changes, while routine changes remain approval-free;
- required conversations stay enabled, while global required approvals remain
  zero;
- only squash merge is enabled, auto-merge is enabled, and merged branches are
  deleted;
- the PR template tells agents to enable native auto-merge and reports whether a
  sensitive pattern was touched.

Enhanced secret-scanning features that the organization plan does not expose are
recorded as plan limitations, not claimed as enabled controls.

## Failure handling and rollback

- A failed or skipped required lane is a failure; aggregate jobs never translate
  missing evidence into success.
- A security scan finding is validated and fixed before the repository hardening
  pull request is merged.
- If a bootstrap pull request fails remotely, auto-merge remains pending while
  the branch is fixed. Repository rules are not weakened to make it pass.
- If the central classifier or aggregate unexpectedly blocks normal work, the
  exact ruleset and Environment configuration are preserved before mutation and
  can be restored through the GitHub API.
- A rule is not considered deployed until two live reads confirm its final state
  and a synthetic normal/sensitive path evaluation proves the intended split.

## Verification

Each repository must pass its existing product-specific checks plus:

- structural policy fixtures covering wrapper drift, future target workflows,
  package/lock authority, required aggregate identity, protected paths, and
  bounded Dependabot YAML;
- `npm ci --ignore-scripts`, `npm audit --audit-level=moderate`, formatting,
  type checking, deterministic tests, build/package checks where present, and
  `git diff --check`;
- `actionlint` for every workflow;
- a standard Codex Security scan at the exact pre-change revision and a focused
  post-change security review;
- live GitHub verification of checks, alerts, Actions policy, ruleset contents,
  team membership, auto-merge settings, and merged default-branch SHA.
