# Coffee Chat README core narrative design

- **Status:** Confirmed design unit
- **Date:** 2026-08-13
- **Owner:** `openboa-ai/coffee-chat`
- **Scope:** Public README branding and information architecture only

## Purpose

The README is Coffee Chat's public front door. It must make the product's mental
model, distinct data, two uses, and first action understandable before routing
implementation, security, licensing, and verification details to narrower
documents.

The page communicates two ideas:

1. The same information can lead sincere people toward different meanings,
   priorities, and next moves. Coffee Chat records that owner-reviewed human
   layer while keeping the source visible.
2. The same reviewed records can ground both Talk and Agent Work.

After the first idea is understood, the README gives the reader one immediate,
Agent-first installation action. The README does not teach installation or usage
itself; it hands those responsibilities to the root `INSTALL_FOR_AGENTS.md`
contract.

This design does not change runtime behavior. The README describes the complete
first-release target and uses one WIP notice to distinguish that target from
current availability.

## Product mental model

Knowing what someone read does not reveal what they made of it.

```text
same information
  -> different meaning
  -> different priority
  -> different next move
```

This difference does not require deception. People ordinarily act on what seems
important and right from where they stand. Their sincerity makes the record
useful as evidence of their judgment; it does not make the judgment objective
truth.

Coffee Chat preserves the missing layer between information and action:

```text
what it meant to you
  -> what mattered to you
  -> what you would do
```

The owner reviews and controls every record. As Agents make execution cheaper,
this human decision about what matters becomes the bottleneck that Coffee Chat
makes available to a Plugin.

## Two-message architecture

### 1. Why the stored data is different

The first explanatory image uses one direct coffee flow:

```text
ORIGIN                 ROAST                              BEAN
The source          -> Meaning · Priority · Next move  -> Your reviewed judgment

Same source. Different meaning. Different next move.
```

Origin keeps the source visible. Roast is the owner's review step. Bean is the
approved judgment, not a rewritten source and not an automatically inferred
profile.

The image must make the practical consequence visible: the same source can lead
to a different next move. It must not stop at the obvious claim that people have
different viewpoints.

### 2. How the record becomes useful

The second explanatory image gives Talk and Work equal weight:

```text
BEANS                  BREW                       COFFEE
Reviewed judgments  -> Select what matters now -> Talk · Work

The same Beans ground Talk and Work.
```

Talk lets a person explore what mattered, why, and what the owner would do. The
AI discloses that it is using the owner's records and never impersonates the
owner.

Work gives an Agent those reviewed priorities while it evaluates, compares, or
creates. The records are contextual input, not an executable global policy and
not a substitute for the owner's final decision.

## README reading flow

The public page follows this sequence:

```text
WIP and branded hero
  -> why the same information leads people in different directions
  -> paste one official installation guide into an Agent
  -> what Coffee Chat records and why that data is distinct
  -> one Bean, two equal uses: Talk and Work
  -> ownership and trust
  -> technical documents
```

Each section answers one reader question. Prose stays short and does not repeat
what the images already make visible.

After the installation handoff, every section follows one scan-first pattern:

```text
short outcome heading
  -> one-sentence conclusion
  -> only the smallest supporting structure
  -> image when it carries information the copy should not repeat
```

The conclusion never waits for the end of a paragraph. A reader who scans only
the headings and first sentences must understand what Coffee Chat stores, where
it is useful, and who controls it.

## Agent-first installation handoff

Immediately after the mental-model section, the README contains only this
action:

```text
## Install with your Agent

Paste this into your Agent:

Install Coffee Chat. Follow this guide:
https://raw.githubusercontent.com/openboa-ai/coffee-chat/main/INSTALL_FOR_AGENTS.md
```

`INSTALL_FOR_AGENTS.md` is a root-level, Agent-facing operational contract. It
owns source verification, current-install detection, official marketplace
registration, Plugin installation, post-install verification, user interaction,
and Skill routing. The public README does not duplicate those steps.

For Codex, the current official repository marketplace path is:

```text
codex plugin marketplace add openboa-ai/coffee-chat --ref main
codex plugin add coffee-chat@openboa-ai
```

The guide must inspect before mutating, refresh the verified official
marketplace before comparing the installed Plugin version with the shared
official CalVer, avoid repeating an identical installation, and report any step
it cannot complete. A version mismatch requires explicit approval before
reinstalling only the local Plugin from the refreshed official marketplace. The
guide must never substitute a personal fork, clone-and-copy workflow, or
arbitrary third-party package for the official Openboa AI Plugin.

Plugin installation remains side-effect-free with respect to product data. It
must not create, fork, sync, activate, or publish a Roastery. After verifying
the Plugin, the Agent explains that only `$coffee-init` is currently implemented
and asks whether the user wants to start it. Init begins only after an explicit
user choice and retains its own Preview and acceptance boundary.

## Confirmed public copy direction

The product introduction is:

> Coffee Chat is an **Agent Plugin** that turns your reviewed judgments into
> records people can explore through **Talk** and Agents can use in **Work**.

The mental-model section leads with:

> **The same information can lead two people in different directions.**

Its two compressed statements are:

> **Same information. Different meaning. Different priority. Different next
> move.**

> **What it meant to you → What mattered to you → What you would do**

The product consequence is:

> **As Agents make execution cheaper, deciding what matters becomes the
> bottleneck.**

After installation, the public copy is fixed to this compressed sequence:

### Store judgment, not just information.

The first sentence states the data distinction:

> A Bean stores your approved judgment—not a copy of what you read.

One short line maps the product terms before the existing explanatory image:

> **Origin** keeps the source visible. **Roast** captures meaning, priority, and
> next move. What you approve becomes a **Bean**.

The section closes only with:

> Across Beans, recurring priorities reveal your **Taste**.

It removes the three-item explanatory list, post-image blockquote, and category
comparison paragraph because the image and first sentence already carry those
jobs.

### Use it in Talk and Work.

The first sentence states the two outcomes with equal weight:

> The same reviewed Beans help people understand your thinking and Agents work
> from your priorities.

The Talk/Work table contains one short job per column. The existing Brew image
follows it. No paragraph after the image repeats the distinction.

### You stay in control.

The first sentence states the ownership boundary:

> Nothing becomes public without your approval.

Only short trust bullets remain: source separation, owner-controlled versioning,
AI disclosure/citation, and no impersonation or replacement of the owner's final
decision.

### Go deeper.

The heading is followed directly by the four owning technical documents. It has
no setup sentence. License remains one compact sentence.

The README does not use a category comparison table or claim that LLM wikis
store only facts. Adjacent systems may preserve rich context; Coffee Chat's
public distinction is its owner-reviewed, source-distinguishable judgment built
for both Talk and Work.

Taste is introduced only after plain-language understanding exists. It names
recurring priorities visible across many Beans; it does not lead the
explanation.

### Public Skill names

The complete first release exposes these user-visible Skill names:

| Skill            | Reader-facing responsibility                 |
| ---------------- | -------------------------------------------- |
| `$coffee-init`   | Create the owner's public Roastery           |
| `$coffee-roast`  | Turn one Origin into a reviewed Bean         |
| `$coffee-chat`   | Talk with one explicitly selected Roastery   |
| `$coffee-brew`   | Use relevant Beans in Agent work             |
| `$coffee-sync`   | Connect or refresh one public Roastery       |
| `$coffee-unsync` | Remove one exact local Roastery relationship |

The six first-release Skill names and their intent routing live in
`INSTALL_FOR_AGENTS.md`. The README does not duplicate that usage guide.

Each portable Skill `name` and parent directory uses the exact `coffee-*`
identifier above. Coffee Blend remains a seventh discoverable deferred Skill,
`coffee-blend`, but stays outside the first-release public narrative. OpenAI
hosts use the Plugin name as a component namespace, so the Agent install guide
must resolve the installed host's discovered identifier rather than inventing an
unqualified alias.

## Selected visual system

### Hero

The hero preserves the selected editorial illustration of two coffee cups facing
across open space. It sits between photoreal product photography and flat
geometric minimalism: tactile enough to feel human, restrained enough to leave
the product narrative in control.

The exact title `COFFEE CHAT` is centered between the cups as a two-line display
lockup. It overlaps the illustration field without adding a card, shadow,
tagline, icon, or new metaphor.

- Production asset: `docs/assets/readme/coffee-chat-hero.png`
- Canvas: `1774 x 887`
- SHA-256: `c08e8550fd9cf8423c2286cd46feeef81f41c4d40c844e534350bd00314d11b0`
- Preserved text-free source:
  `docs/assets/readme/source/coffee-chat-hero-illustration.png`
- Title token: `display/2xl`, `wght 550`, `wdth 96`, tracking `-0.025`

### Explanatory images

The two explanatory images use the same `1576 x 998` grid, illustration weight,
and copy hierarchy. Each contains one horizontal flow, three stage labels, one
short explanation per stage, and one closing statement. Neither contains a
headline or extra decorative object.

Image 1 contains one unroasted coffee bean, one simplified roasting machine, one
roasted Bean, and exactly two right-facing arrows.

Image 2 contains a small group of Beans, one pour-over dripper, one Coffee cup,
and exactly two right-facing arrows. It contains no floating Bean or internal
Brew arrow.

Both images sit between a flat infographic and a detailed illustration. They
exclude realistic ceramic rendering, complex lighting, cast shadows, botanical
drawings, UI cards, and decorative cafe objects.

### OpenBoa brand application

- Dominant colors are Quiet Off-white `#F8F8F5`, Blue Carbon `#111820`, and
  Terracotta `#A64F3C` from OpenBoa Brand System 2026.08.12.
- Martian Grotesk is the only visible Latin typeface.
- The hero uses `display/2xl`; explanatory images use `overline`, `body/lg`, and
  `heading/lg` with their canonical axes and tracking.
- Illustration texture and tonal variation may add tactile depth without
  introducing a new dominant color.
- The official OpenBoa symbol, lockups, and scale geometry are not redrawn into
  coffee objects.

ImageGen owns only the text-free raster illustration layers. Exact title and
copy are added by the deterministic Pillow composer with the canonical physical
`MartianGrotesk-wdth-wght.ttf` file. The audit manifest records source, canvas,
font digest, token, axes, tracking, bounds, and final PNG digest.

## Guardrails

- A first-time reader must not need Taste, PoV, or another product label to
  understand the premise.
- Do not reintroduce removed lifecycle or artifact vocabulary.
- Do not claim that an LLM wiki preserves only facts or cannot contain
  interpretation.
- Do not frame Coffee Chat as generic memory, a personality profile, a digital
  self, style transfer, or impersonation.
- Keep source evidence and owner-reviewed judgment visibly distinguishable.
- Treat sincerity as evidence of priorities, not proof of objective truth.
- Give Talk and Work equal visual and verbal weight.
- Keep exactly one availability disclaimer at the top.
- Keep technical implementation, security, licensing, and verification details
  in linked documents.
- After installation, keep headings outcome-led and no longer than six words.
- Put each section's conclusion in its first sentence.
- Remove paragraphs that merely restate an adjacent image, table, or callout.
- Keep the README installation handoff short; do not reproduce commands or a
  usage tutorial outside `INSTALL_FOR_AGENTS.md`.
- Installation must not create or mutate a Roastery, and the Agent must not
  automatically invoke `$coffee-init` after installing the Plugin.
- Use new or approved ImageGen raster sources; never substitute SVG production
  art.

## Verification

The completed README and assets must satisfy these checks:

1. In five seconds, a reader can identify why the stored data is different and
   that it powers both Talk and Work.
2. The practical consequence of personal judgment reaches `different next move`,
   not only `different viewpoint`.
3. A reader can distinguish Origin, owner-reviewed Bean, and AI-produced Coffee.
4. The page never implies that the AI is the owner or that sincerity proves
   objective truth.
5. The Agent-install block appears between the mental model and the
   distinct-data explanation and links to the official raw
   `INSTALL_FOR_AGENTS.md`.
6. The README states current availability once; installation and usage details
   are not duplicated.
7. After installation, a heading-only scan yields `store judgment`,
   `use it in Talk and Work`, `stay in control`, and `go deeper`.
8. Every post-install section leads with its conclusion and contains no
   paragraph that repeats an adjacent image or table.
9. The installation guide verifies the official source, installs through the
   supported Plugin path, preserves side-effect-free installation, and reports
   the current Skill boundary honestly.
10. All PNGs, exact copy, font use, audit records, hashes, local links, package
    contents, and deterministic reproduction checks pass.

## Deferred visual

A separate lifecycle visual remains optional. It may be added only if the final
README still contains a comprehension gap after the hero and two explanatory
images are reviewed together.
