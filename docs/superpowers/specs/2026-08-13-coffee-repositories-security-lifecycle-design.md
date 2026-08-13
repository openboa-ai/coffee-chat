# Coffee Repositories Security Lifecycle Design

- **Date:** 2026-08-13
- **Scope:** `openboa-ai/coffee-chat`, `coffee-chat-roastery`,
  `coffee-chat-eval`, and `coffee-chat-bench`
- **Decision:** Path-sensitive human review with GitHub-native automatic merge

## Objective

Operate the four public Coffee repositories safely with one human maintainer and
an organization-member development agent. Normal changes should merge
automatically after deterministic security and quality checks pass. Only changes
to narrowly defined security-governance or external-side-effect boundaries
should wait for one human review.

The hardening rollout itself is authorized to complete without a manual review.
Repository rules that require future sensitive-path review are therefore enabled
only after the bootstrap pull requests have passed their required checks and
merged.

## Considered approaches

### 1. Global approval for every pull request

This is simple, but makes the human maintainer a queue for documentation, tests,
and routine dependency updates. It does not match the requested autonomous agent
lifecycle.

### 2. Workflow environment approval for sensitive changes

A workflow can detect sensitive paths and pause on a protected environment. This
adds a manual gate, but the gate definition lives in the same workflow surface
that a pull request can modify. It also creates another custom status controller
to maintain.

### 3. Repository ruleset path review plus native auto-merge

This is the selected design. A repository ruleset, outside the candidate tree,
requires one review from a human-only team when a configured file pattern is
changed. All pull requests may have GitHub-native squash auto-merge enabled.
Non-sensitive pull requests merge when checks pass; sensitive pull requests
remain queued until the team approval is present and then merge automatically.

## Actors and authority

- `openboa` remains an organization member and is the expected author for agent
  pull requests.
- `dependabot[bot]` is the only additional machine identity admitted for its
  GitHub-authored dependency pull requests.
- `SonSangjoon` is the sole member of a new `security-maintainers` team.
- The agent account is deliberately excluded from that team, so it cannot
  satisfy the sensitive-path review it triggered.
- The rulesets retain no bypass actors. Changes use pull requests and squash
  merge; direct updates, deletions, and non-fast-forward updates to `main` stay
  blocked.
- A human-authored sensitive change should be transferred to an agent-authored
  branch or pull request so the human can supply the independent review.

## Pull request lifecycle

1. An agent works on a non-default branch, runs repository-local verification,
   opens a pull request, and enables GitHub-native squash auto-merge.
2. The trusted `pull_request_target` secret boundary checks the candidate as
   data only. It scans the worktree, history, and raw Git blobs without running
   candidate code or exposing secrets.
3. Read-only `pull_request` jobs run deterministic quality, repository-policy,
   dependency, and CodeQL checks. External model or benchmark execution stays
   manual and fail-closed.
4. The repository ruleset evaluates changed paths:
   - no sensitive match: green required checks are sufficient;
   - sensitive match: one `security-maintainers` review is additionally
     required.
5. GitHub performs the squash merge and deletes the branch. No custom
   write-token merge controller is introduced.

`merge_group` remains supported by every candidate-executing workflow so the
same checks remain usable if merge queues are enabled later. The current solo
maintainer lifecycle does not require a merge queue.

## Sensitive path policy

All repositories require review for these shared control surfaces:

- `.github/**/*`
- `.githooks/**/*`
- `AGENTS.md`
- `SECURITY.md`
- `CODEOWNERS`
- `.gitleaksignore`
- `.gitleaks.toml`

Additional repository-specific boundaries are intentionally narrow:

| Repository             | Additional sensitive paths                                                                                                                                                                    | Reason                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `coffee-chat`          | `.agents/**/*`, `.codex-plugin/**/*`, `contract/roastery-authority.json`, `runtime/github.mjs`, `runtime/registry.mjs`, `runtime/init.mjs`, `runtime/init-cli.mjs`, `skills/coffee-init/**/*` | Agent/plugin authority and code capable of GitHub or Registry writes |
| `coffee-chat-roastery` | `contract/**/*`, `roastery/roastery.json`                                                                                                                                                     | Canonical downstream contract and executable authority pin           |
| `coffee-chat-eval`     | `integrations/harbor/**/*`, `src/harbor.ts`, `src/pcda-harbor.ts`, `src/pcda-runner.ts`, `src/registry.ts`, `src/runner.ts`                                                                   | External candidate/model execution and registry boundaries           |
| `coffee-chat-bench`    | `config/judges/**/*`, `harbor/**/*`, `src/openai-judge.ts`                                                                                                                                    | Judge configuration and external model/verifier execution            |

Package manifests are not manually gated. The dependency review action, lockfile
install, audit, type/build/test gates, and structural policy contract provide
the automated boundary for dependency changes. Major routine version updates are
suppressed from Dependabot version-update churn; security updates remain enabled
and compatible minor/patch updates are grouped.

## Repository-local security contract

Each repository has a structural YAML policy test that rejects policy bypasses
instead of relying on regular expressions. The test parses every workflow with
duplicate-key rejection and checks at least these invariants:

- the workflow set is explicit;
- candidate workflows use `pull_request` and `merge_group`, never
  `pull_request_target` or secrets;
- the secret boundary uses only `pull_request_target` and optional manual
  dispatch, checks out trusted controls and candidate data separately, and does
  not execute the candidate;
- permissions are explicit, minimal, and checked at both workflow and job
  levels;
- reusable actions are allowlisted and pinned to full commit SHAs, including
  nested or flow-style YAML;
- checkout credentials are never persisted;
- quality jobs reject candidate execution before checkout unless the pull
  request author is `OWNER`, `MEMBER`, or exactly `dependabot[bot]`;
- locked dependency installation ignores lifecycle scripts, and a moderate
  vulnerability audit runs before repository code;
- dependency review fails on moderate-or-higher runtime, development, or
  unknown-scope additions and uses exact merge-group base/head SHAs;
- required aggregate check names and the package command that invokes the policy
  contract cannot silently drift.

Workflow jobs have bounded timeouts. CodeQL remains an advanced workflow because
it must support `merge_group`; native code-scanning merge protection is
tightened to block medium-or-higher findings and analysis errors.

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
- rulesets require strict repository-specific quality, dependency review,
  secret-boundary, and CodeQL checks;
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
- If a new path-review rule unexpectedly blocks normal work, its exact ruleset
  JSON is preserved before mutation and can be restored through the GitHub API.
- A rule is not considered deployed until two live reads confirm its final state
  and a synthetic normal/sensitive path evaluation proves the intended split.

## Verification

Each repository must pass its existing product-specific checks plus:

- structural workflow-policy fixture tests covering duplicate keys, escaped
  keys, aliases, job-level permission overrides, unpinned actions, missing CI
  invocation, and weakened package commands;
- `npm ci --ignore-scripts`, `npm audit --audit-level=moderate`, formatting,
  type checking, deterministic tests, build/package checks where present, and
  `git diff --check`;
- `actionlint` for every workflow;
- a standard Codex Security scan at the exact pre-change revision and a focused
  post-change security review;
- live GitHub verification of checks, alerts, Actions policy, ruleset contents,
  team membership, auto-merge settings, and merged default-branch SHA.
