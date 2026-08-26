# Coffee Chat product thesis

- **Status:** Maintained product rationale and research basis
- **Last reviewed:** 2026-08-25
- **Authority:** Why Coffee Chat exists, which research informs it, and which
  product decisions follow from that research

Coffee Chat starts from a distinction that ordinary knowledge systems leave
implicit: possessing the same information does not mean making the same thing of
it.

This document explains that distinction and the research behind it. It is not a
runtime specification, an availability claim, a benchmark result, or a claim
that Coffee Chat can recover a complete model of a person. Current behavior is
owned by the machine-readable [capability contract](config/capabilities.json),
the runtime, and the [product boundaries](docs/product-boundaries.md). The
corresponding product architecture is maintained in the
[system design](docs/engineering/coffee-chat-system-design.md).

## Product thesis

Knowledge alone does not explain a person's judgment.

People can encounter the same news, paper, event, or plan and sincerely notice
different cues, assign different importance to them, connect them to different
goals, and choose different next steps. The missing information is not another
copy of the source. It is the person's situated account of what the source
meant, what mattered, and what followed.

> **Coffee Chat makes an owner-reviewed, source-distinguishable record of a
> situated judgment available for disclosed conversation and bounded Agent
> work.**

The record is something the owner intentionally says and approves. It is not a
hidden profile inferred by an AI, objective proof that the judgment is correct,
or permission for an AI to impersonate the owner.

## From information to judgment

Several research traditions study different parts of the phenomenon. Coffee Chat
uses them as explanatory lenses, not as API names or schema fields.

```text
source or event
  -> construal: what this person understood it to be
  -> appraisal and valuation: why it mattered in this context
  -> sensemaking: how it fit into an actionable account
  -> situated judgment: what the person concluded, rejected, or chose
  -> reviewed record: what the owner intentionally made available
```

The final arrow is a Coffee Chat product decision. Psychological research can
inform how meaning and judgment differ across people; it cannot confer the
owner's authority or approval.

## Evidence discipline

Coffee Chat documentation separates four kinds of statement:

- **Research evidence** reports what a cited study or review investigated.
- **Product inference** states how that evidence informs a falsifiable product
  hypothesis.
- **Product decision** defines a boundary Coffee Chat chooses to enforce.
- **Implementation status** reports only behavior present in the current package
  and verified by its declared evidence.

Conflating those categories would turn a plausible rationale into an unsupported
product claim. Research supports the problem framing; Coffee Chat must still
prove its own usefulness, safety, and fidelity.

## Research basis

### Construal, appraisal, value, and sensemaking

The founding premise does not depend on one study or one account of bias. It is
supported by converging work on selective perception, subjective construal,
appraisal, personal values, goal-dependent valuation, and sensemaking.

| Research                                                                                                                                            | Result relevant to the thesis                                                                                                            | Limit on the inference                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Hastorf & Cantril, _They Saw a Game_ (1954)](https://doi.org/10.1037/h0057880)                                                                     | Students affiliated with opposing teams perceived and attributed the same game differently.                                              | A classic field study does not establish how every modern information task behaves.                  |
| [Lord, Ross & Lepper, _Biased Assimilation and Attitude Polarization_ (1979)](https://doi.org/10.1037/0022-3514.37.11.2098)                         | Participants evaluated mixed evidence through prior positions and did not converge simply because they saw the same evidence.            | It supports prior-position effects, not the truth or value of any resulting judgment.                |
| [Griffin & Ross, _Subjective Construal, Social Inference, and Human Misunderstanding_ (1991)](<https://doi.org/10.1016/S0065-2601(08)60333-0>)      | The review describes behavior as guided by people's subjective representations of situations rather than one passively received reality. | A construal is still an interpretation, not a replacement for the underlying source.                 |
| [Smith & Ellsworth, _Patterns of Cognitive Appraisal in Emotion_ (1985)](https://doi.org/10.1037/0022-3514.48.4.813)                                | Experiences varied systematically with appraisals such as certainty, responsibility, control, and anticipated effort.                    | Coffee Chat must not infer a complete appraisal model from sparse records.                           |
| [Schwartz, _Are There Universal Aspects in the Structure and Contents of Human Values?_ (1994)](https://doi.org/10.1111/j.1540-4560.1994.tb01196.x) | Values are organized as motivational goals whose relative importance guides selection and evaluation.                                    | A situated judgment does not prove a stable or exhaustive value hierarchy.                           |
| [Weick, Sutcliffe & Obstfeld, _Organizing and the Process of Sensemaking_ (2005)](https://doi.org/10.1287/orsc.1050.0133)                           | Sensemaking connects selected cues and interpretation to a situation that can guide action.                                              | An actionable account can still be incomplete, contested, or wrong.                                  |
| [Yeshurun et al., _Same Story, Different Story_ (2017)](https://doi.org/10.1177/0956797616682029)                                                   | Brief prior contexts led groups to interpret the same narrative differently while retaining shared lower-level comprehension.            | Shared interpretation in an experiment is not evidence that a product can reconstruct an individual. |
| [Castegnetti et al., _How Usefulness Shapes Neural Representations During Goal-Directed Behavior_ (2021)](https://doi.org/10.1126/sciadv.abd5363)   | Represented usefulness varied with the current goal and predicted choice.                                                                | Goal-dependent valuation does not make every preference durable or generalizable.                    |

Together, this work supports a modest premise: source access alone is
insufficient to predict what a particular person will regard as meaningful,
important, or actionable. It does not prove that all disagreements are useful,
that every self-description is accurate, or that Coffee Chat's representation is
effective.

### Research on personalized language systems

Relevant technical research spans personalization, memory, interaction,
evaluation, and person understanding. Its useful contribution is to separate
those problems and expose the evidence each one still needs.

| Research area                         | Evidence from the literature                                                                                                                                                                                               | Boundary it clarifies for Coffee Chat                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personalized alignment                | [Guan et al. (Findings of ACL 2025)](https://aclanthology.org/2025.findings-acl.277/) organize the field around preference memory, personalized generation, and feedback-based alignment within broader value constraints. | Personalization is a broad system problem. Coffee Chat's narrower claim depends on owner-reviewed records, not personalization alone.                                                       |
| Profile-conditioned generation        | [LaMP (ACL 2024)](https://aclanthology.org/2024.acl-long.399/) evaluates personalized classification and generation using multiple items from a user profile and retrieval augmentation.                                   | Retrieving useful personal evidence can affect output, but a profile item is not automatically an owner-approved account of meaning.                                                        |
| Preference-conditioned evaluation     | [PerSE (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.737/) evaluates open-ended generation against preferences inferred from an in-context personal profile.                                                      | Coffee Chat needs owner-specific evaluation, while an automated judge remains evidence to calibrate rather than final owner authority.                                                      |
| Interactive preference learning       | [ALOE (COLING 2025)](https://aclanthology.org/2025.coling-main.511/) studies dynamic alignment through multi-turn interaction using generated personas and role-play.                                                      | Interaction may reveal preferences, but synthetic or conversation-derived inference is not real-owner approval and must not silently become a canonical Bean.                               |
| Long-term memory                      | [LongMemEval (ICLR 2025)](https://openreview.net/forum?id=pZiyCaVuti) separates extraction, cross-session reasoning, temporal reasoning, updating, and abstention in long-running assistant memory.                        | Remembering, updating, and abstaining are distinct capabilities; a generic memory score cannot establish judgment fidelity.                                                                 |
| Person understanding beyond retrieval | [KnowMe-Bench (ACL 2026)](https://aclanthology.org/2026.acl-long.1394/) reports that retrieval augmentation helps factual accuracy more than temporally grounded explanations and higher-level inference.                  | Retrieval is not equivalent to understanding a person's motivations or decision principles. Coffee Chat should preserve explicit owner evidence instead of claiming hidden-person recovery. |
| Factuality under personalization      | [PERG (Findings of EMNLP 2025)](https://aclanthology.org/2025.findings-emnlp.870/) evaluates personalization together with factual correctness rather than treating preference alignment as sufficient.                    | Source grounding and owner alignment require separate checks; one must not conceal failure in the other.                                                                                    |

This research changes the product question from “how do we store more about a
user?” to “what evidence is needed for an Agent to use an owner's situated
judgment without confusing retrieval, inference, approval, factuality, and
authority?”

## Product inferences and decisions

The following links from research to design are explicit hypotheses. They are
not findings from the cited papers.

| Research-informed observation                                                   | Coffee Chat inference                                                                          | Product decision or test                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The same source can be construed differently.                                   | The source and the owner's meaning are separate information layers.                            | Keep Origin provenance distinguishable from the Bean body; compare against a source-only control.       |
| Relevance and value depend on goals and context.                                | A useful record should preserve situated importance and limits, not only a generic preference. | Do not claim that sparse Beans form a complete or permanent personality model.                          |
| Sensemaking connects interpretation to action.                                  | The record may be useful in Work only if it helps explain or improve a consequential judgment. | Evaluate decisions and outputs, not retrieval alone.                                                    |
| Personalized generation and evaluation need person-specific evidence.           | Fidelity must be evaluated against the identified owner and task.                              | Use owner review and independently calibrated evidence; do not promote an LLM judge to owner authority. |
| Memory systems fail differently at recall, updating, reasoning, and abstention. | Sync, validation, selection, Brew, and generation need separate evidence.                      | Do not treat successful access to a repository as proof of correct or safe use.                         |
| Personalized output can lose factual correctness.                               | Agreement with an owner record and grounding in a source are independent quality dimensions.   | Preserve citations and test both dimensions separately.                                                 |

Coffee Chat therefore adopts these product boundaries:

1. **Source and judgment stay distinguishable.** An Origin is provenance; a Bean
   is the owner's reviewed expression. Neither silently replaces the other.
2. **The owner is the publication authority.** AI may help formulate a
   candidate, but conversation or generated text never becomes a Bean without an
   explicit owner-controlled publication path.
3. **Records remain situated.** A Bean is attributable evidence for a stated
   judgment, not an exhaustive identity, universal policy, or permanent value
   profile.
4. **Use is disclosed.** Talk and Work must make clear that an AI is using
   owner-authored records. The AI does not speak as the owner or imply the
   owner's endorsement of generated output.
5. **Authority does not flow backward.** Reading another person's public
   Roastery never grants permission to edit it, alter the owned Roastery, or
   change project policy.
6. **Claims require their own evidence.** Package correctness, live-provider
   behavior, owner fidelity, usefulness, and construct validity are different
   claims with different verification owners.

## What a Bean is meant to preserve

A useful record can make several facets inspectable:

```text
Origin
  the public source or event reference

meaning
  what the owner understood or concluded

importance
  what stood out and which trade-offs mattered

consequence
  what the judgment suggested, rejected, or changed

context and limits
  the goal, situation, uncertainty, and scope in which it held

authority and provenance
  who approved the record and which version is being used
```

These are conceptual facets, not a promise of separate schema fields. The
current Standard Roastery contract deliberately keeps a Bean's canonical
frontmatter narrow and its owner-reviewed expression human-readable. Schema and
publication rules are owned by the vendored
[Roastery contract](contract/roastery/README.md).

## Intended outcomes

### Talk

Talk is the intended experience in which another person explores what mattered
to an owner and why. The AI is a disclosed interface to selected records; it is
not the owner.

### Work

Work is the intended use of selected owner records as contextual evidence while
an Agent evaluates or creates something. A Bean is not executable policy and
does not replace the owner's final decision.

Both outcomes remain product targets. In the current package, only Init is
implemented; Roast, Sync, Brew, Coffee Chat, Coffee Blend, and Unsync remain
closed as `not_implemented`.

## What Coffee Chat does not claim

Coffee Chat is not defined as:

- a repository of copied source material;
- a generic conversation-memory or retrieval layer;
- an automatically inferred preference profile;
- a personality test, psychological assessment, or whole-person model;
- a digital twin or an AI that speaks as the owner;
- proof that an owner's judgment is factually correct or ethically sound; or
- an executable global policy for every Agent and project.

Those exclusions are part of the thesis, not merely current implementation
limitations.

## Evaluation obligations

Before Coffee Chat claims that Talk or Work provides value, evaluation should
separate at least these questions:

1. Does the output remain grounded in the cited Bean and, where relevant, its
   Origin?
2. Does it reflect the identified owner's approved judgment better than a
   source-only and a matched-information control?
3. Does it preserve uncertainty, context, attribution, and non-impersonation?
4. Does it improve a declared external outcome rather than only retrieval or
   stylistic similarity?
5. Does the behavior remain safe when repositories, Beans, Origins, and model
   output are treated as untrusted data?

The [Coffee Chat evaluator](https://github.com/openboa-ai/coffee-chat-eval) owns
candidate execution and result evidence. The
[Coffee Chat benchmark](https://github.com/openboa-ai/coffee-chat-bench) owns
candidate-independent constructs and validity evidence. Neither repository can
make an unimplemented product capability available, and no active performance
claim is made here.

## Decision status

Maintained decisions:

- Coffee Chat records owner-reviewed, source-distinguishable situated judgment.
- The human layer of interest is meaning, importance, and consequence—not
  knowledge possession alone.
- Origin, Bean, owner authority, and AI-generated output remain distinct.
- Talk and Work are the intended outcomes, with disclosure and non-impersonation
  boundaries.
- Research informs the design but does not prove the product or authorize a
  whole-person claim.

Open questions requiring product or empirical evidence:

- the smallest Bean form that preserves useful context without overfitting a
  schema;
- the best owner-review interaction for Roast;
- the exact measures of fidelity, usefulness, and owner confidence;
- how much context Talk and Work need for different tasks; and
- which supported host surfaces can preserve the required consent, isolation,
  provenance, and deletion boundaries.
