---
name: roast
description: Use when the user wants to extract, refine, review, or explicitly confirm a person's perspective, priorities, trade-offs, or judgment from source material. Do not use for applying an already confirmed perspective to a new task.
---

# Roast

Roast turns an Origin into a candidate Bean by preserving the person's expressed
Perspective and the factual context needed to understand it.

## Contract

1. Treat the complete prompt and input environment as the source of truth.
2. Separate source facts, a one-off opinion, and a reusable perspective.
3. Identify what the person considers important, how they resolve trade-offs,
   when the judgment applies, and what remains uncertain.
4. Keep claims grounded in the Origin. Never turn an unsupported inference,
   personality label, or generalization into the person's perspective.
5. Present a reviewable candidate and ask the user to correct or confirm its
   exact meaning.
6. Only an explicit user confirmation makes the result a Bean. Until then it is
   an unconfirmed candidate and must not be persisted or used as confirmed
   Taste.

If the Origin does not contain enough perspective signal, ask a focused question
or state that the perspective cannot yet be determined.

Roast does not apply a Bean to a new task. That is Brew's responsibility.
