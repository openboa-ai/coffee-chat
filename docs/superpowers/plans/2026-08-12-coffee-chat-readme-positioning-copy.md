# Coffee Chat README Positioning Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Coffee Chat's one-of-one position immediately understandable
without falsely reducing LLM wikis or adjacent products to fact storage.

**Architecture:** Keep the existing product-first README and selected hero, but
replace the category contrast with a job-based comparison and state Coffee
Chat's unique contract as one compact combination. Expose only the final
`coffee-*` Skill names in the usage section, and project the same decisions into
the README narrative specification and contract test.

**Tech Stack:** GitHub-flavored Markdown, Node.js built-in test runner, Prettier

## Global Constraints

- Call Coffee Chat an `Agent Plugin`; do not use `Codex-first`.
- Do not claim that an LLM wiki stores only facts.
- Compare adjacent categories by their primary job, not by an invented content
  limitation.
- Lead Coffee Chat with owner-reviewed judgment that can be used for both Talk
  and Work.
- Use `$coffee-init`, `$coffee-sync`, `$coffee-roast`, `$coffee-brew`,
  `$coffee-chat`, and `$coffee-unsync` as the public Skill interfaces.
- Keep exactly one WIP notice at the top and exclude Coffee Blend.

---

### Task 1: Lock the public copy contract

**Files:**

- Modify: `tests/readme-assets.test.mjs`
- Modify: `README.md`

**Interfaces:**

- Consumes: confirmed one-of-one positioning and final public Skill names
- Produces: a README whose product identity, comparison, unique contract, and
  usage interface can be checked mechanically

- [x] **Step 1: Replace the old facts-only assertion with the new contract**

Require `Agent Plugin`, `Owner-reviewed`, `Talk`, `Work`, and all six
`$coffee-*` Skill names. Reject `Codex-first`, the facts-only wiki framing, old
bare Skill names, and Coffee Blend.

- [x] **Step 2: Run the focused test and observe the expected failure**

Run: `node --test tests/readme-assets.test.mjs`

Expected: FAIL because the README still contains the old category contrast and
old Skill labels.

- [x] **Step 3: Rewrite the README copy**

Use this reading order:

1. problem: knowledge is easy to keep; personal judgment remains hard to use;
2. category map: LLM wiki, Agent memory, digital self, Coffee Chat;
3. unique combination: reviewed, owned/versioned, disclosed, Talk + Work;
4. Talk and Work outcomes;
5. Origin, Bean, Coffee;
6. install and six `$coffee-*` Skills;
7. trust and technical document links.

- [x] **Step 4: Run the focused test**

Run: `node --test tests/readme-assets.test.mjs`

Expected: PASS.

### Task 2: Project and verify the confirmed decision

**Files:**

- Modify:
  `docs/superpowers/specs/2026-08-12-coffee-chat-readme-core-narrative-design.md`

**Interfaces:**

- Consumes: final README copy contract from Task 1
- Produces: one maintained narrative authority that no longer describes an LLM
  wiki as fact-only and records the final Skill prefix

- [x] **Step 1: Update the specification**

Replace the material-type comparison with a job-based category distinction,
record `Agent Plugin`, and add the six `$coffee-*` public Skill names.

- [x] **Step 2: Scan for superseded wording**

Run:

```sh
rg -n "Codex-first|factual wiki|A wiki keeps what you read|`init`|`sync`|`roast`|`brew`|`unsync`" \
  README.md docs/superpowers/specs/2026-08-12-coffee-chat-readme-core-narrative-design.md
```

Expected: no match.

- [x] **Step 3: Verify the complete change**

Run:

```sh
npm run verify
git diff --check
```

Expected: both commands succeed.
