> [!IMPORTANT] **WIP** — Coffee Chat is under active development. This README
> describes the complete first release. Only `$coffee-init` is implemented
> today; the other listed Skills are not yet available.

# Coffee Chat

![Two illustrated coffee cups facing each other across an open table in the OpenBoa color palette.](docs/assets/readme/coffee-chat-hero.png)

## Knowledge is easy to store. Judgment is still trapped in your head.

Two people can read the same article and make different decisions. The
difference is often not what they know. It is what they notice, value, and
choose to do.

Coffee Chat is an Agent Plugin that turns what you make of things into
**owner-reviewed records**—so people can talk with them and Agents can use them
at work.

![An unroasted coffee bean passes through Roast and becomes an owner-reviewed Bean.](docs/assets/readme/coffee-chat-judgment.png)

## What makes Coffee Chat different

Knowledge systems, memory systems, and digital selves can all hold rich context.
Coffee Chat is distinguished by the job it is built to do.

| Category                    | Its primary job                                                 |
| --------------------------- | --------------------------------------------------------------- |
| **LLM wiki / second brain** | Keep knowledge organized, connected, and retrievable            |
| **Agent memory**            | Help an Agent remember users, conversations, and prior activity |
| **Digital self**            | Let an AI represent or act on behalf of a person                |
| **Coffee Chat**             | Make a person's reviewed judgments usable for Talk and Work     |

Coffee Chat's one-of-one design is the complete loop:

> **You review the judgment → you own the record → people can Talk with it →
> Agents can Work with it.**

- **Reviewed, not inferred.** An AI cannot silently decide what you believe.
- **Owned, not hidden.** Your records are attributable, inspectable, and
  versioned.
- **Disclosed, not impersonated.** The AI uses your records without pretending
  to be you.
- **Useful beyond recall.** The same records power both Talk and Work.

## One record. Two uses.

| **Talk**                                                        | **Work**                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Understand how someone sees a subject and what they prioritize. | Give your Agent those priorities when it evaluates or creates.     |
| Ask what mattered, why, and what they would do.                 | Review plans, compare options, surface risks, and make trade-offs. |

Talk is an AI conversation grounded in the owner's records. Work uses those
records as visible context. Neither one claims to reproduce the whole person or
replace their final decision.

![Reviewed Beans pass through Brew to ground conversation and Agent work.](docs/assets/readme/coffee-chat-talk-work.png)

## Origin. Bean. Coffee.

**Origin → Bean → Coffee**

- **Origin** — what you responded to, linked when there is a public source.
- **Bean** — what you made of it, reviewed by you.
- **Coffee** — what the Agent makes with the relevant Beans for this task.

Your **Roastery** is the public, versioned home for your Beans. Across many
Beans, recurring priorities become visible. Coffee Chat calls this **Taste**. It
comes from reviewed records, not a hidden profile.

## Install

When the first release is available, install **Coffee Chat** from the Plugins
Directory and enable it in a new conversation.

## Skills

The first release will provide these public Skills. Choose the one that matches
what you want to do.

| Skill                | Use it to                 |
| -------------------- | ------------------------- |
| **`$coffee-init`**   | Build your Roastery       |
| **`$coffee-sync`**   | Connect a Roastery        |
| **`$coffee-roast`**  | Save a judgment as a Bean |
| **`$coffee-brew`**   | Use Beans in Agent work   |
| **`$coffee-chat`**   | Talk with one Roastery    |
| **`$coffee-unsync`** | Disconnect a Roastery     |

At release, `$coffee-init` and `$coffee-roast` will show the exact public change
before asking for approval. `$coffee-brew` and `$coffee-chat` will use reviewed
Beans without rewriting the Roastery.

## Designed for trust

- You approve every Bean before it becomes public.
- Your Roastery stays owner-controlled and versioned on GitHub.
- Other people's Roasteries remain read-only.
- AI output is disclosed and cited. It never silently becomes a new Bean.

## Documentation

Technical and governance details live in their owning documents:

- [Product and release boundaries](docs/product-boundaries.md)
- [Roastery contract, storage, and rights](contract/roastery/README.md)
- [Quality map](docs/quality-map.md)
- [Security policy](SECURITY.md)

## License

The official Coffee Chat Plugin is [MIT licensed](LICENSE), Copyright © 2026
Openboa AI. Personal Bean content uses the fixed CC BY 4.0 declaration accepted
by its owner; Origin URLs and the resources they identify remain outside that
grant.
