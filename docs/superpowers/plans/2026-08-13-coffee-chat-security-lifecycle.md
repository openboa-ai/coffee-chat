# Coffee Chat Security Lifecycle Implementation Plan

> **Execution:** Follow test-driven development and the repository `AGENTS.md`.
> Commit each green task separately. Do not mutate GitHub until local tasks and
> review are complete.

**Goal:** Close scan `674659d2-180c-45e0-8aff-9dc432111887` High finding,
structurally harden Coffee Chat CI, and encode the approved selective-review
agent lifecycle without changing the shipped Plugin behavior.

**Architecture:** Repository workflows remain read-only and candidate execution
is restricted to organization owners/members. A structural YAML contract rejects
workflow-policy bypasses. The live organization ruleset later supplies
human-only team review for sensitive paths. Coffee Init supplies the equivalent
boundary to user-owned forks with a target-owner `CODEOWNERS` bootstrap and
ruleset-enforced code-owner review.

**Stack:** Node.js 24, `yaml`, Node test runner, GitHub Actions, GitHub
Rulesets, Gitleaks, CodeQL, npm.

---

## Task 1: Encode the scan finding at the downstream fork boundary

**Files:**

- Modify: `tests/github-boundary-acceptance.test.mjs`
- Modify: `runtime/github.mjs`

**Red tests:** Extend the existing protected-fork acceptance test and add a
focused rejection test proving that:

- the protection bootstrap writes a target-owner `CODEOWNERS` file before the
  ruleset becomes active;
- the file owns `.github`, `CODEOWNERS`, security policy, executable/runtime,
  contract, and package-control paths, but not `roastery/CONTENT_LICENSE.md`,
  `roastery/roastery.json`, or `roastery/beans/**`;
- the pull-request rule has zero general approvals, requires code-owner review,
  and dismisses stale approvals;
- required checks include `Secret boundary` and
  `Roastery CodeQL JavaScript-TypeScript` in addition to the existing required
  and dependency-review lanes;
- selected-only Actions, SHA pinning, and read-only workflow token defaults are
  verified;
- a ruleset without code-owner review or trusted-boundary context is rejected.

Run the focused test and record the expected failure before production edits:

```bash
node --test tests/github-boundary-acceptance.test.mjs
```

**Implementation:** Add the narrowest repository-native helpers in
`runtime/github.mjs` to create and verify the deterministic owner-bound
`CODEOWNERS` bootstrap commit, tighten Actions settings, and enforce the new
ruleset contract. Preserve the exact pinned seed verification, two-file Init PR,
automatic squash merge, error codes, and zero-write preflight paths.

**Green checks:**

```bash
node --test tests/github-boundary-acceptance.test.mjs
node --test tests/init-acceptance.test.mjs tests/init-cli-acceptance.test.mjs
git diff --check
```

Commit: `fix: require owner review for fork security controls`

## Task 2: Replace the workflow contract with structural policy and fixtures

**Files:**

- Modify: `.github/ci-policy.mjs`
- Modify: `tests/workflow-policy.test.mjs`
- Modify: `package.json`

**Red fixtures:** Before changing the checker, add isolated fixture mutations
that must be rejected:

- duplicate YAML mapping keys;
- escaped `permissions` and `uses` keys;
- YAML aliases and flow-style unpinned actions;
- a future workflow with write permissions;
- a job-level write-permission override;
- an extra `pull_request_target` on any candidate workflow;
- removal or relocation of `npm run policy` from the owning quality job;
- weakening the `policy` package command;
- missing timeout, checkout credential persistence, author gate, immutable
  install, audit, dependency threshold/scope, or exact merge-group SHA.

Run the focused suite and record each representative bypass passing under the
old checker before implementation.

**Implementation:** Keep `yaml@2.9.0`; parse all workflow files with unique-key
enforcement. Traverse mappings, arrays, flow collections, and aliases. Enforce
the exact workflow set and repository-specific jobs/commands. Permit only the
CodeQL job's documented `security-events: write`; every other token remains
read-only or empty. Require every `uses` value to be an allowlisted full SHA.

The production command must run fixtures before the checker:

```json
"policy": "node --test tests/workflow-policy.test.mjs && node .github/ci-policy.mjs"
```

Avoid recursive test invocation by making fixture subprocesses run the checker
directly with an isolated-root environment variable.

**Green checks:**

```bash
npm run policy
node --test tests/workflow-policy.test.mjs
git diff --check
```

Commit: `test: enforce structural workflow policy`

## Task 3: Harden Actions, dependency review, and audit lanes

**Files:**

- Modify: `.github/workflows/codeql.yml`
- Modify: `.github/workflows/dependency-review.yml`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/secret-boundary.yml`
- Modify: `.github/dependabot.yml`
- Modify: `.github/merge-policy.json`

**Red:** Tightened Task 2 fixtures must fail against the current workflows.

**Implementation:**

- add bounded timeouts to every job;
- keep all action references at the already approved full SHAs;
- install dependencies with `npm ci --ignore-scripts`;
- run `npm audit --audit-level=moderate` before any repository npm script;
- set dependency review to `fail-on-severity: moderate`,
  `fail-on-scopes: runtime,development,unknown`, `show-patched-versions: true`,
  and no PR comment;
- keep exact `merge_group.base_sha` and `merge_group.head_sha`;
- preserve Gitleaks history/worktree/raw-blob coverage and trusted-base
  execution;
- add the CodeQL context to the repository merge-policy contract;
- group production and development minor/patch npm updates separately, group
  compatible GitHub Actions updates, keep security-update groups, and ignore
  routine semver-major version updates.

**Green checks:**

```bash
npm run policy
npm run format:check
npm run typecheck
npm test
npm run readme:assets:verify
npm run build
npm run package:smoke
npm audit --audit-level=moderate
actionlint .github/workflows/*.yml
git diff --check
```

Commit: `ci: harden Coffee Chat security gates`

## Task 4: Document the agent merge contract

**Files:**

- Modify: `AGENTS.md`
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `SECURITY.md` only if its reporting guidance is incomplete
- Verify: `CODEOWNERS`

**Red:** Add policy assertions that the agent contract states GitHub-native
auto-merge and selective sensitive review and that it does not authorize custom
write-token merge automation.

**Implementation:** Tell agents to work through pull requests, run exact local
checks, enable squash auto-merge, and accurately mark whether a sensitive path
changed. State that organization rules—not the agent—decide whether human review
is required. Replace the obsolete “zero approvals for all changes” wording.

**Green checks:**

```bash
npm run policy
npm run format:check
npm run verify
git diff --check
```

Commit: `docs: define selective-review agent lifecycle`

## Task 5: Change-aware security closure and handoff

**Files:** Review the complete branch diff; do not add unrelated cleanup.

**Verification order:**

1. Re-run the original downstream-fork exploit regression and its legitimate
   two-file Init control.
2. Remove the code-owner requirement in an isolated fixture and prove the
   regression fails.
3. Exercise an alternate bypass using an escaped or aliased YAML key.
4. Run `npm ci --ignore-scripts`, `npm audit --audit-level=moderate`,
   `npm run verify`, `actionlint`, and `git diff --check` from a clean install.
5. Run a focused post-change Codex Security review at the final commit.
6. Request independent whole-branch review and address only validated feedback.

Do not claim the scan finding fixed until the external organization ruleset also
contains the human-only sensitive-path reviewer and two live reads confirm it.
