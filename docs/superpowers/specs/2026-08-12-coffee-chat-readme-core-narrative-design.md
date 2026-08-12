# Coffee Chat README core narrative design

**Status:** Confirmed design unit **Date:** 2026-08-12 **Owner:**
`openboa-ai/coffee-chat` **Scope:** Public README branding and information
architecture only

## Purpose

The official README is Coffee Chat's public front door. It must make the product
understandable and desirable before it routes implementation, security,
licensing, verification, and repository details to narrower documents.

This design unit fixes the two ideas that the README must communicate without
requiring a reader to learn product terminology first:

1. Coffee Chat makes owner-reviewed personal judgment its primary product asset;
   it does not depend on a claim that adjacent systems keep only facts.
2. The same reviewed records can ground both conversation and practical Agent
   work.

This unit does not change runtime behavior. The public README describes the
complete first implementation target, with a single WIP notice at the top.

## Product premise

People can read the same news, paper, or source and sincerely reach different
interpretations. Each person naturally emphasizes different evidence,
priorities, risks, and trade-offs because their own judgment feels correct from
where they stand.

That judgment is not another objective fact. It is useful because it honestly
reveals how a person receives information, what they consider important, and how
they are likely to use it. Coffee Chat keeps the shared material and the
person's authored judgment distinguishable.

As Agents make execution abundant, deciding what matters, what good looks like,
and which trade-off to accept becomes the limiting human input. Coffee Chat's
product direction is to make a person's authored judgments available as
inspectable context for Agent conversations and work. It is not a generic
knowledge system, a tone-personalization layer, a global decision rule, or an AI
impersonation of the author.

## Two-message architecture

### 1. Why the product job is different

The README must show one shared source branching into several honest human
readings. The visual should make the distinction perceptible before prose
explains it:

```text
one shared source
  -> person A emphasizes and concludes one thing
  -> person B emphasizes and concludes another
  -> person C emphasizes and concludes another
```

The source remains shared evidence. Coffee Chat's primary asset is the person's
reviewed interpretation, prioritization, and judgment about that evidence.

The scene must not imply that a viewpoint becomes objective truth merely because
it is sincere. It must instead make the author's priorities visible,
attributable, and inspectable.

### 2. Conversation and practical use

The second scene must show one authored judgment record flowing into two
distinct user outcomes:

```text
authored judgment record
  -> Talk: explore how the author receives and judges the subject
  -> Work: let the owner's Agent and projects use those declared priorities
```

`Talk` is an AI conversation grounded in the author's public records. It never
claims that the AI is the author.

`Work` means that an Agent can use the owner's authored judgments as contextual
input when comparing options, surfacing risks, evaluating trade-offs, or
producing work. The record informs the work; it is not an executable policy or
an automatic substitute for the owner's decision.

## README reading flow

The public page should follow this compact sequence:

```text
why this is needed
  -> what Coffee Chat records
  -> Talk
  -> Work
  -> start a relevant journey
  -> use it
  -> technical and governance documents
```

The first visual owns the material distinction. The second visual owns the
conversation-and-use distinction. Prose supports those visuals and must not
repeat them as a long essay.

## Confirmed public copy direction

The opening message is:

> **Knowledge is easy to store. Judgment is still trapped in your head.**

The supporting explanation is:

> Coffee Chat is an Agent Plugin that turns what you make of things into
> owner-reviewed records—so people can talk with them and Agents can use them at
> work.

The category distinction is based on primary job rather than an invented limit
on what another system may contain:

| Category                    | Primary job                                                     |
| --------------------------- | --------------------------------------------------------------- |
| **LLM wiki / second brain** | Keep knowledge organized, connected, and retrievable            |
| **Agent memory**            | Help an Agent remember users, conversations, and prior activity |
| **Digital self**            | Let an AI represent or act on behalf of a person                |
| **Coffee Chat**             | Make a person's reviewed judgments usable for Talk and Work     |

Coffee Chat's one-of-one position is the combination of four properties:

1. **Owner-reviewed:** an AI inference does not silently become the owner's
   judgment.
2. **Owned and versioned:** records are attributable, inspectable, and under
   owner control.
3. **AI-disclosed:** the interface uses the records without impersonating the
   owner.
4. **Built for Talk + Work:** the same records support both human exploration
   and Agent work.

### Public Skill names

The complete first release exposes these user-visible Skill names:

| Skill            | Responsibility                               |
| ---------------- | -------------------------------------------- |
| `$coffee-init`   | Build the owner's public Roastery            |
| `$coffee-sync`   | Connect or refresh one public Roastery       |
| `$coffee-roast`  | Propose one owner-reviewed Bean              |
| `$coffee-brew`   | Use relevant Beans in Agent work             |
| `$coffee-chat`   | Talk with one explicitly selected Roastery   |
| `$coffee-unsync` | Remove one exact local Roastery relationship |

Public README usage leads with these Skill names. It does not substitute bare
implementation capability labels such as `init`, `sync`, `roast`, `brew`, or
`unsync`.

## Selected visual direction

The selected hero is a restrained editorial illustration of two coffee cups
facing across open space. It occupies the midpoint between photoreal product
photography and flat geometric minimalism: clearly designed, tactile enough to
feel human, and simple enough to leave the product copy in control.

Coffee is the direct identity cue, while the paired composition suggests
conversation. The hero does not attempt to encode the full product model,
lifecycle, Talk, or Work in one image.

The selected asset is:

1. `docs/assets/readme/coffee-chat-hero.png`; `1774 x 887`; SHA-256
   `cb8211087ff8998119ac08a46e477c02d1c61b99e71fa1aadd63c62d78d21bfc`.

It is a self-contained PNG and does not depend on a browser page, animation,
remote font, or remote image. Rejected vector studies and their generator are
excluded from the selected production asset set.

### OpenBoa brand application

- Primary identity and composition colors are exactly Terracotta `#A64F3C`,
  Quiet Off-white `#F8F8F5`, and Blue Carbon `#111820` from the canonical
  OpenBoa Brand System 2026.08.12.
- The image contains no visible type and therefore has no font dependency.
- Composition follows the OpenBoa quiet-infrastructure premise through measured
  space, restrained subject count, and a clear visual hierarchy.
- OpenBoa scale geometry may provide background rhythm, but the official symbol
  and lockups may not be redrawn, cropped, recolored, or transformed into a cup,
  steam, or diagram node.
- Quiet Off-white, Blue Carbon, and Terracotta remain the dominant colors; small
  tonal variation is permitted only to give the raster illustration depth.

The system excludes photoreal product photography, complex diagrams, tasting
flights, cafe scenes, and former coffee-production lifecycle imagery. Legacy
README imagery remains mood evidence only; no pixels, tracing, or composition
source may be reused.

### Approved explanatory image set

The README adds two labeled raster images after the hero. Each image contains
one short horizontal flow and explains one product reason. The images do not ask
an unlabeled illustration to carry the concept alone.

#### Image 1: why Roast is needed

The first image uses this exact flow and copy:

```text
ORIGIN                  ROAST                         BEAN
What you received   ->  Review what it means to you  ->  Your judgment, on record

The same source can mean something different to each person.
```

`Roast` is an owner-review action, not an automatic source transformation. The
image uses coffee objects as a restrained visual metaphor: one unroasted green
bean for Origin, one simplified drum-roasting machine for Roast, and one roasted
bean for Bean. Exactly two right-facing arrows connect the three stages; the
objects contain no internal arrows or extra transformation marks. It explains
why storing the source alone is insufficient.

#### Image 2: why Brew is needed

The second image uses this exact flow and copy:

```text
BEANS                       BREW                           COFFEE
Your reviewed judgments  -> Select and apply what matters -> Talk and Work, grounded in them

Your priorities can now travel into conversation and Agent work.
```

`Brew` is a read-only application action. It selects relevant reviewed Beans for
the current conversation or task and produces ephemeral Coffee without rewriting
the Beans. The image contains a small group of Beans, one pour-over dripper for
Brew, and one Coffee cup. Exactly two horizontal right-facing arrows connect the
three stages. The Brew stage contains no floating Bean, internal arrow, or other
transformation cue.

Both images use the same fixed landscape grid at approximately `1200 x 760`.
They sit between a flat infographic and a detailed illustration: each object
uses two or three color planes, a thin imperfect outline, and only enough paper
grain to feel human. They exclude realistic ceramic rendering, liquid detail,
complex lighting, cast shadows, botanical drawings, UI cards, and decorative
objects.

The explanatory set uses Quiet Off-white `#F8F8F5` as the dominant field, Blue
Carbon `#111820` for text and structural contrast, and Terracotta `#A64F3C` for
the action and controlled accent. Natural coffee brown is permitted only where
needed to keep a Bean readable. The official OpenBoa symbol, scale pattern, or
logo is not redrawn into coffee objects.

Both images share three uppercase stage labels, one short explanation per stage,
and one bold closing sentence. Neither image has a headline. No other copy
appears. All exact text must be inspected at original resolution before a
preview can be selected.

Image generation owns the illustration layer only. All visible copy is added in
a deterministic raster-composition pass using the canonical physical
`MartianGrotesk-wdth-wght.ttf` file from OpenBoa Brand System 2026.08.12. Stage
labels use the `overline` token (`wght 650`, `wdth 100`, tracking `0.08`),
supporting descriptions use the `body/lg` token (`wght 450`, `wdth 100`,
tracking `0`), and the closing sentence uses the `heading/lg` token (`wght 550`,
`wdth 96`, tracking `0`). Each token uses one fixed size across both
`1576 x 998` images; copy may not shrink independently to fit. Full sentences
are shaped as native whole strings so the font's own kerning remains intact;
custom tracking applies only to stage labels. Generated lettering, font
substitution, and visually similar fallback fonts are not acceptable.

### README integration checkpoint

The selected two-cup PNG remains the only visual referenced by the README until
the two labeled explanatory previews are approved. The README describes the
complete first product target through `coffee-chat`, places one WIP notice at
the top, and excludes `coffee-blend`.

## Guardrails

- A first-time reader must not need `Taste`, `PoV`, or other product labels to
  understand the premise. A maintained product term may be introduced only after
  plain-language understanding exists.
- Do not reintroduce removed legacy lifecycle or artifact vocabulary.
- Do not claim that LLM wikis preserve only facts or cannot preserve
  interpretation, opinion, or other rich context.
- Compare adjacent categories by their primary job rather than weakening their
  capabilities to manufacture a contrast.
- Do not frame Coffee Chat as a generic LLM memory, personality profile,
  identity simulation, style transfer, or impersonation system.
- Keep source evidence and authored judgment visibly distinct.
- Treat sincerity as evidence of the author's real priorities, not as proof of
  objective correctness.
- Keep `Talk` and `Work` visibly separate; neither may collapse into a generic
  "personalized AI" claim.
- Distinguish the approved first-release direction from current implementation
  with one WIP notice at the top; do not interrupt the product narrative with
  repeated implementation disclaimers.
- Keep technical implementation, repository boundaries, security, licensing, and
  verification details in linked documents rather than leading with them.
- Create the README image system from new source assets. Legacy README imagery
  is mood reference only and must not be recolored or reused as production
  source.
- Apply the canonical OpenBoa brand system to identity, color, typography,
  spacing, pattern, contrast, accessibility, and asset handoff.

## Verification

The completed README and assets must pass these checks:

1. A five-second review can identify both core messages: the material is
   authored human judgment rather than duplicated raw facts, and it can ground
   both conversation and work.
2. A reader can distinguish source evidence, author judgment, and AI-generated
   output without reading a technical document.
3. The page never implies that the AI is the author or that a sincere judgment
   is objective truth.
4. The page does not require unexplained product terminology or removed legacy
   concepts.
5. Talk, Work, current availability, and the next action remain scannable on a
   narrow GitHub viewport.
6. Local links, image paths, alt text, heading hierarchy, formatting, and
   light/dark contrast are valid.
7. The top WIP notice makes clear that the documented first-release experience
   is still being implemented.
8. The product is called an Agent Plugin and its usage section exposes only the
   six confirmed `$coffee-*` Skill names.

## Remaining decision

A separate lifecycle visual remains optional and deferred. It may be added only
after the selected hero and complete README are reviewed together.
