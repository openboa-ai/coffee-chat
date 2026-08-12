# Coffee Chat README Explanatory Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and integrate a coherent two-image README set that explains
why reviewed judgment matters and how one record supports Talk and Work.

**Architecture:** Generate text-free Roast and Brew illustration layers, then
compose every visible label deterministically with the canonical physical
Martian Grotesk font and OpenBoa typography tokens. Only owner-approved raster
assets enter the repository; README tests bind their paths, dimensions, hashes,
font provenance, and placement.

**Tech Stack:** Built-in ImageGen, Pillow, canonical Martian Grotesk variable
font, OpenBoa design tokens, PNG assets, Markdown, Node.js README contract
tests.

## Global Constraints

- Use only Origin, Roast, Bean, Beans, Brew, Coffee, Talk, and Work as product
  concepts.
- Use Quiet Off-white `#F8F8F5`, Blue Carbon `#111820`, and Terracotta `#A64F3C`
  as the dominant palette.
- Use simple two-to-three-plane illustrations with thin imperfect outlines and
  restrained paper grain: more tactile than a flat infographic and less detailed
  than an illustration.
- Do not use photoreal product photography, realistic liquid or ceramic detail,
  complex shadows, UI cards, people, robots, brains, or new metaphors.
- Each image owns exactly one message.
- Use the exact approved English copy without paraphrase or added text.
- ImageGen must not render final copy. Add all final copy deterministically with
  `MartianGrotesk-wdth-wght.ttf` from the pinned OpenBoa source commit.
- Stage labels use the OpenBoa `overline` token, descriptions use `body/lg`, and
  the closing sentence uses `heading/lg`; each token uses one fixed size across
  both final rasters.
- Neither image has a headline. Full sentences use native whole-string shaping;
  custom tracking applies only to stage labels.

---

### Task 1: Produce the Roast illustration layer

**Files:**

- Reference: `docs/assets/readme/coffee-chat-hero.png`
- Reference:
  `docs/superpowers/specs/2026-08-12-coffee-chat-readme-core-narrative-design.md`
- Preview only: built-in ImageGen output paths

**Interfaces:**

- Consumes: the approved first-image composition and OpenBoa palette
- Produces: one inspected text-free Roast illustration layer

- [x] **Step 1: Generate one text-free Roast flow layer**

Generate one landscape illustration layer with no visible copy. Show Origin as
one unroasted green bean, Roast as one simplified drum-roasting machine, and
Bean as one roasted bean. Use exactly two right-facing arrows between stages and
no internal arrows or transformation marks. Leave measured negative space for
deterministic typography.

- [x] **Step 2: Inspect the preview at original resolution**

Reject a preview with any visible or ghosted text, ambiguous reading order,
extra stage or arrow, detailed realism, generic UI card, or palette drift. Retry
only the failed output, with at most two total attempts.

### Task 2: Produce the matching Brew illustration layer

**Files:**

- Create after selection: `docs/assets/readme/coffee-chat-talk-work.png`
- Reference: inspected Task 1 output

**Interfaces:**

- Consumes: the first image's grid, type hierarchy, palette, and illustration
  density
- Produces: one inspected text-free layer of the matching Brew flow

- [x] **Step 1: Generate the text-free Brew flow layer**

Generate one landscape layer with no visible copy and the linear
`BEANS -> BREW -> COFFEE` illustration flow. Preserve the approved three Beans,
one pour-over dripper, and one Coffee cup while leaving measured negative space
for deterministic typography. Use exactly two horizontal right-facing arrows. Do
not place a Bean, internal arrow, or other transformation cue above or inside
the Brew stage.

- [x] **Step 2: Inspect the preview at original resolution**

Confirm there is no visible or ghosted text, then inspect linear reading order,
object clarity, shared grid, matching texture, and exact palette dominance.
Retry only the failed output, with at most two total attempts.

### Task 3: Compose and audit canonical typography

**Files:**

- Create: `docs/assets/readme/source/compose_explanatory_images.py`
- Create: `docs/assets/readme/source/coffee-chat-judgment-illustration.png`
- Create: `docs/assets/readme/source/coffee-chat-talk-work-illustration.png`
- Create: `docs/assets/readme/source/MartianGrotesk-wdth-wght.ttf`
- Create: `docs/assets/readme/source/LICENSE-MartianGrotesk-OFL.txt`
- Create: `docs/assets/readme/coffee-chat-judgment.png`
- Create: `docs/assets/readme/coffee-chat-talk-work.png`

**Interfaces:**

- Consumes: both inspected illustration layers, pinned OpenBoa typography
  tokens, physical font bytes, and exact approved copy
- Produces: deterministic final PNGs and a machine-readable font audit

- [x] **Step 1: Copy the pinned font and adjacent license**

Verify the physical font SHA-256 is
`f81807163c34ff754e6d915b0b59f76cca88332b67c45cfc7453ace5751ae912`.

- [x] **Step 2: Compose exact copy**

Use the physical variable font at the approved weight and width axes. Render
stage labels from `overline`, descriptions from `body/lg`, and closing copy from
`heading/lg`, using one fixed size per token across both `1576 x 998` images.
Shape every sentence in one native text call so the font's kerning is preserved.

Store the two approved text-free illustration layers beside the composer and
invoke it only with repository-relative source and output paths so the audit is
portable and contains no local workstation path.

- [x] **Step 3: Audit output**

Emit and verify the exact strings, font filename and digest, applied axes,
tracking, bounding boxes, canvas dimensions, and final PNG digests. Reject any
overflow or overlap.

### Task 4: Obtain owner review

**Files:**

- Preview only: built-in ImageGen output paths

**Interfaces:**

- Consumes: the two inspected previews
- Produces: owner selection or bounded revision feedback

- [x] **Step 1: Show both previews together**

Keep both previews outside the product repository and ask the owner to approve,
reject, or identify one precise refinement.

### Task 5: Integrate selected assets and verify the README

**Files:**

- Modify: `README.md`
- Modify: `docs/assets/readme/README.md`
- Modify: `tests/readme-assets.test.mjs`

**Interfaces:**

- Consumes: the two owner-selected PNG files
- Produces: a locally complete README with deterministic asset checks

- [x] **Step 1: Confirm only selected images are referenced**

Use stable descriptive filenames. Record dimensions and SHA-256 digests in the
asset documentation and tests.

- [x] **Step 2: Place each image after its owning README message**

Use concise semantic alt text. Do not repeat the image's message as a long
caption.

- [x] **Step 3: Update asset contract tests**

Assert PNG signatures, approved dimensions and hashes, README references,
semantic alt text, and the absence of rejected SVG assets.

- [x] **Step 4: Run verification**

Run: `npm run verify && git diff --check`

Expected: formatting, typecheck, all tests, build, package smoke, policy, and
diff checks pass.
