# Coffee Chat README Scanability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every README section after installation understandable from its
short heading and first sentence, while removing repeated prose.

**Architecture:** Keep the approved images and installation handoff unchanged.
Replace the four post-install sections with outcome-led headings, one-sentence
conclusions, compact supporting structures, and no prose that repeats an
adjacent image or table.

**Tech Stack:** Markdown, Node.js `node:test`, existing README verification.

## Global Constraints

- Preserve the single WIP availability notice and current implementation
  boundary.
- Preserve the existing hero and two explanatory PNGs byte-for-byte.
- Preserve equal Talk and Work weight.
- Keep source evidence and owner-reviewed judgment distinguishable.
- Keep installation and usage mechanics in `INSTALL_FOR_AGENTS.md`.
- Do not introduce new product behavior or availability claims.

---

### Task 1: Update the scan-order contract

**Files:**

- Modify: `tests/readme-assets.test.mjs`

**Interfaces:**

- Consumes: the confirmed post-install section sequence.
- Produces: a structural check that protects section order without freezing
  unconstrained paragraph wording.

- [ ] **Step 1: Replace the old post-install headings in the README test**

Require these headings in order:

```js
[
  "## Store judgment, not just information.",
  "## Use it in Talk and Work.",
  "## You stay in control.",
  "## Go deeper.",
];
```

Also reject the superseded long headings and the removed post-image repetition.

- [ ] **Step 2: Run the focused test and observe the expected failure**

```bash
node --test tests/readme-assets.test.mjs
```

Expected: FAIL because `README.md` still contains the superseded headings.

### Task 2: Compress the post-install README

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: the existing judgment and Talk/Work images.
- Produces: four scan-first sections with the conclusion at the top.

- [ ] **Step 1: Replace the judgment section**

```markdown
## Store judgment, not just information.

A Bean stores your approved judgment—not a copy of what you read.

**Origin** keeps the source visible. **Roast** captures meaning, priority, and
next move. What you approve becomes a **Bean**.
```

Keep the existing judgment image, then close with one Taste sentence.

- [ ] **Step 2: Replace the use section**

```markdown
## Use it in Talk and Work.

The same reviewed Beans help people understand your thinking and Agents work
from your priorities.
```

Keep a one-row Talk/Work table and the existing Brew image. Remove the paragraph
after the image.

- [ ] **Step 3: Compress trust, documentation, and license**

Use `## You stay in control.` with
`Nothing becomes public without your approval.`, short trust bullets, and
`## Go deeper.` directly followed by the four owning links. Compress License to
one sentence.

- [ ] **Step 4: Run focused and full verification**

```bash
node --test tests/readme-assets.test.mjs
npm run verify
git diff --check
```

Expected: all commands exit 0; all README image digests remain unchanged.

- [ ] **Step 5: Inspect the final reading path**

```bash
sed -n '32,130p' README.md
git diff -- README.md tests/readme-assets.test.mjs
```

Expected: the post-install headings and first sentences alone communicate stored
data, use, control, and deeper documentation. Do not commit, push, or merge
without the user's review.
