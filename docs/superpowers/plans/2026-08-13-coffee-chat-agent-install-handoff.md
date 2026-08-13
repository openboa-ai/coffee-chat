# Coffee Chat Agent Install Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a README visitor one short prompt they can paste into an Agent,
then let a root `INSTALL_FOR_AGENTS.md` guide that Agent through official Plugin
installation, verification, interaction, and Skill routing.

**Architecture:** The README remains the human-facing landing page and contains
only the handoff prompt. The root install guide is the Agent-facing operational
contract. Packaging includes that contract, and focused tests lock the handoff
position, supported commands, source boundary, and side-effect-free installation
rule.

**Tech Stack:** Markdown, Node.js `node:test`, Codex Plugin CLI, existing
package collector.

## Global Constraints

- Official publisher is `Openboa AI`; official source is
  `https://github.com/openboa-ai/coffee-chat`.
- Use Taste vocabulary and never introduce profile terminology as a product
  concept.
- Installation may change Plugin marketplace, cache, and local Plugin state
  only; it must not create, fork, sync, activate, or publish a Roastery.
- Only `$coffee-init` is implemented today. The other five public first-release
  Skills are not yet available.
- All seven packaged Skill names and parent directories use the `coffee-*`
  prefix. `$coffee-blend` remains discoverable and deferred outside the six
  first-release public journeys.
- Do not install from a personal fork, clone Plugin files by hand, or improvise
  an unsupported host path.
- Keep exactly one WIP notice in the public README.

---

### Task 1: Lock the public-to-Agent handoff contract

**Files:**

- Modify: `tests/readme-assets.test.mjs`
- Create: `tests/install-for-agents.test.mjs`
- Modify: `tests/package-archive.test.mjs`

**Interfaces:**

- Consumes: the confirmed README narrative ordering and official Codex Plugin
  CLI.
- Produces: executable assertions for the README prompt, Agent guide, and
  package contents.

- [ ] **Step 1: Write the failing README contract test**

Add assertions that require the exact raw GitHub URL between the mental-model
and distinct-data sections. In the dedicated Agent-install contract test,
require `INSTALL_FOR_AGENTS.md`, the official marketplace and Plugin add
commands, inspect-before-mutate ordering, the no-clone and side-effect-free
boundaries, explicit Init acceptance, and intent routing for all seven packaged
Skill names. Cross-check every Skill frontmatter name against its matching
`coffee-*` parent directory.

- [ ] **Step 2: Write the failing package contract test**

Assert that `INSTALL_FOR_AGENTS.md` is present in `collectFiles(root)` and in
`packageRoots`.

- [ ] **Step 3: Run the focused tests to verify they fail**

Run:

```bash
node --test tests/readme-assets.test.mjs tests/package-archive.test.mjs
```

Expected: FAIL because the README handoff and root Agent guide do not exist and
the guide is absent from `packageRoots`.

### Task 2: Add the Agent-facing installation contract

**Files:**

- Create: `INSTALL_FOR_AGENTS.md`
- Modify: `scripts/package-lib.mjs`

**Interfaces:**

- Consumes: `.agents/plugins/marketplace.json`, `docs/product-boundaries.md`,
  and the supported `codex plugin marketplace add` / `codex plugin add` CLI.
- Produces: one official installation and interaction protocol available both in
  the repository and packaged Plugin.

- [ ] **Step 1: Write the exact Agent guide**

The guide instructs the Agent to inspect before changing local state, reuse a
verified official installation, add the official marketplace only when absent,
install the official Plugin only when absent, verify the result, report any
blocked step, preserve side-effect-free installation, and ask before starting
`$coffee-init`.

- [ ] **Step 2: Include the guide in the package**

Add `INSTALL_FOR_AGENTS.md` to the explicit `packageRoots` list next to the
other root documents.

- [ ] **Step 3: Run the focused tests**

Run:

```bash
node --test tests/readme-assets.test.mjs tests/package-archive.test.mjs
```

Expected: Agent guide and package assertions PASS; README assertions still FAIL.

### Task 3: Add the short README action and remove the tutorial

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: `INSTALL_FOR_AGENTS.md` at the stable raw GitHub URL.
- Produces: a human-facing paste action after the mental model and a compact
  direct route into the Agent-owned installation guide.

- [ ] **Step 1: Insert the short handoff block**

Insert this immediately after the bottleneck statement:

```text
## Install with your Agent

Paste this into your Agent:

Install Coffee Chat. Follow this guide:
https://raw.githubusercontent.com/openboa-ai/coffee-chat/main/INSTALL_FOR_AGENTS.md
```

- [ ] **Step 2: Remove the existing usage tutorial**

Remove `Start with Coffee Chat` and its numbered instructions. Skill names,
interaction, and routing live in `INSTALL_FOR_AGENTS.md` and are not repeated in
the public README.

- [ ] **Step 3: Run focused tests to verify they pass**

Run:

```bash
node --test tests/readme-assets.test.mjs tests/package-archive.test.mjs
```

Expected: PASS.

### Task 4: Verify the complete documentation change

**Files:**

- Verify: `README.md`
- Verify: `INSTALL_FOR_AGENTS.md`
- Verify: `scripts/package-lib.mjs`
- Verify: `tests/readme-assets.test.mjs`
- Verify: `tests/package-archive.test.mjs`

**Interfaces:**

- Consumes: the completed public and Agent-facing documents.
- Produces: evidence that formatting, package shape, tests, visual assets, and
  repository whitespace remain valid.

- [ ] **Step 1: Format and inspect the changed files**

Run:

```bash
npx prettier --check README.md INSTALL_FOR_AGENTS.md scripts/package-lib.mjs tests/readme-assets.test.mjs tests/package-archive.test.mjs docs/superpowers/specs/2026-08-12-coffee-chat-readme-core-narrative-design.md docs/superpowers/plans/2026-08-13-coffee-chat-agent-install-handoff.md
```

Expected: all files use canonical formatting.

- [ ] **Step 2: Run repository verification**

Run:

```bash
npm run verify
```

Expected: build, package, smoke, test, typecheck, audit, and README asset checks
all pass.

- [ ] **Step 3: Check the final diff**

Run:

```bash
git diff --check
git status --short
git diff -- README.md INSTALL_FOR_AGENTS.md scripts/package-lib.mjs tests/readme-assets.test.mjs tests/package-archive.test.mjs
```

Expected: no whitespace errors; only intentional README-branding branch changes
remain. Do not commit, push, or merge without the user's review.
