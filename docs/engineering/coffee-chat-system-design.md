# Coffee Chat system design

- **Status:** Maintained product-owned integration design
- **Last verified:** 2026-08-25
- **Current package identity:** `2026.8.23`
- **Current availability:** Init only

This document explains how the Coffee Chat product repository turns the
[product thesis](../../PRODUCT-THESIS.md) into bounded software behavior. It is
deliberately current-state first: implemented behavior and future design gates
are kept separate so that a diagram or plan cannot be mistaken for a shipped
capability.

Coffee Chat is the main product and release repository. It owns its Plugin
package, capability interface, runtime, product-facing integration contracts,
and product tests. A coordination checkout or sibling repository is never an
implicit runtime dependency or an alternate source of product truth.

## Reading authority

When prose and executable state disagree, use this order:

1. [`config/capabilities.json`](../../config/capabilities.json) defines the
   discoverable capability set, entrypoints, CalVer, and availability.
2. The two Plugin manifests and [`runtime/`](../../runtime/) define packaged
   identity and behavior.
3. [`contract/roastery-authority.json`](../../contract/roastery-authority.json)
   and the vendored [`contract/roastery/`](../../contract/roastery/) bytes
   define the exact Standard Roastery authority consumed by this package.
4. [`SECURITY.md`](../../SECURITY.md),
   [`docs/product-boundaries.md`](../product-boundaries.md), and
   [`docs/quality-map.md`](../quality-map.md) define maintained product and
   verification boundaries.
5. This document explains the relationships and the minimum gates for changing
   them. It cannot make a capability available by itself.

Every status statement below is therefore either **current** or **deferred**.
Deferred behavior is a constraint on later work, not an implementation claim.

## System outcome and design principles

Coffee Chat is intended to make an owner's reviewed, source-distinguishable
judgments usable in disclosed Talk and bounded Work. The system must do that
without converting public repositories, model output, or conversation history
into ambient authority.

Five principles shape the design:

1. **Machine-readable availability is authoritative.** The package must say
   `not_implemented` until behavior and evidence land together.
2. **Consent precedes side effects.** A state-changing operation binds its exact
   target and consequences before its first write.
3. **Data is not instruction.** Repositories, Beans, Origins, declarations,
   event payloads, and model output are untrusted data.
4. **Owner and external state do not mix.** Reading another Roastery cannot
   mutate it, the owned Roastery, the product repository, or host policy.
5. **Evidence stays claim-specific.** Package tests, live provider checks,
   behavioral evaluation, and benchmark validity prove different things.

## System context and ownership

```text
                         build-time, exact commit + digest
  coffee-chat-roastery --------------------------------------+
  Standard contract                                          |
                                                             v
  +----------------------- coffee-chat --------------------------+
  | Plugin manifests -> capability contract -> Skills -> runtime |
  |                                      |                       |
  |                                      +-> vendored validator  |
  +--------------------------------------------------------------+
                  | current Init                   | future reads
                  v                                v
       owner's public Roastery          selected public Roasteries
       fork + protected main             untrusted, immutable snapshot
                  |
                  v
       one local owned Registry record

  coffee-chat-eval  -> executes a pinned package as an external candidate
  coffee-chat-bench -> owns candidate-independent constructs and measures
```

| Surface                                                                                 | Owns                                                                                                               | Relationship to the product                                                                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| [`openboa-ai/coffee-chat`](https://github.com/openboa-ai/coffee-chat)                   | Official Plugin source, product integration behavior, package identity, capability status, and product tests       | The only release authority for Coffee Chat                                                                    |
| [`openboa-ai/coffee-chat-roastery`](https://github.com/openboa-ai/coffee-chat-roastery) | Bean-free fork seed, closed schemas, safe parser/renderer/validator, content declaration, and publication contract | Consumed only through the exact vendored commit and digest; never imported from a sibling checkout at runtime |
| Owner's public `coffee-chat` fork                                                       | One owner's canonical Roastery and protected Git history                                                           | Created by accepted Init; data remains owner-controlled and untrusted to every consumer                       |
| [`openboa-ai/coffee-chat-eval`](https://github.com/openboa-ai/coffee-chat-eval)         | Candidate execution, isolation evidence, receipts, and product behavior reports                                    | Treats a pinned Coffee Chat package as external; cannot grant product availability                            |
| [`openboa-ai/coffee-chat-bench`](https://github.com/openboa-ai/coffee-chat-bench)       | Candidate-independent constructs, tasks, measures, and validity evidence                                           | Does not import Coffee Chat implementation internals                                                          |

Repository-specific details remain in the repository that owns them. This
document records only the product-facing dependency and trust boundary.

## Package and capability interface

Coffee Chat is a Codex-first, Skills-only Agent Plugin. The package has two
manifest projections—root `plugin.json` and `.codex-plugin/plugin.json`—but one
Coffee Chat CalVer and one seven-capability interface. It contains no MCP
server, app, lifecycle hook, or background process.

Discovery reads `config/capabilities.json`; it does not invoke a Skill or
activate a Roastery.

| Capability   | Skill           | Current state     | Side effects in this CalVer                       |
| ------------ | --------------- | ----------------- | ------------------------------------------------- |
| Init         | `coffee-init`   | `available`       | Exact Preview followed by explicit accepted Apply |
| Sync         | `coffee-sync`   | `not_implemented` | None                                              |
| Unsync       | `coffee-unsync` | `not_implemented` | None                                              |
| Roast        | `coffee-roast`  | `not_implemented` | None                                              |
| Brew         | `coffee-brew`   | `not_implemented` | None                                              |
| Coffee Chat  | `coffee-chat`   | `not_implemented` | None                                              |
| Coffee Blend | `coffee-blend`  | `not_implemented` | None                                              |

The six deferred launchers return a structured `not_implemented` result and must
preserve zero network, filesystem, Git, GitHub, Registry, cache, model, host,
and publication effects. Natural-language routing may select a Skill, but it
cannot bypass that runtime state.

## Current runtime: Init

Init is the only current external-write surface. It creates the authenticated
owner's public `coffee-chat` fork from the frozen Standard Roastery seed and
registers that fork locally only after protected public state is verified.

Plugin installation is not Init. Installing or discovering the package does not
create a repository, select a Roastery, fetch external content, or write local
Coffee Chat state.

### Preview is pure

`createInitPreview` accepts exactly an owner login and owner attribution. It
normalizes and binds all consequential inputs into one deterministic digest:

- the official public seed repository, commit, tree, and default branch;
- the exact public target repository;
- the Standard Roastery contract repository, commit, and digest;
- the fixed CC BY 4.0 Bean-content declaration and its attribution;
- all seven publication and rights notices;
- the rights-authority attestation;
- the branch, pull-request, CI, squash-merge, and final-registration path; and
- the partial-failure recovery boundary.

Preview performs no GitHub or Registry write. Apply accepts only `accept`,
`reject`, or `cancel`; an accepted operation must present the exact Preview
digest and an explicit rights attestation. Rejection, cancellation, malformed
input, altered Preview content, and missing attestation stop without writes.

### Accepted Apply sequence

```text
accepted exact Preview
  -> local Registry preflight                 read only
  -> authenticated GitHub + frozen seed check read only
  -> create exact public fork                 first external write
  -> configure repository and protection
  -> propose CODEOWNERS + manifest + content declaration on a branch
  -> open PR and request protected squash auto-merge
  -> verify exact public main, rules, files, empty Bean state, and license
  -> atomically create one local owned Registry record
```

The order is a safety property:

- an existing or malformed Registry, wrong authenticated owner, changed seed,
  stale seed tree, or existing target fails before the fork;
- protection is established before initialization content is proposed;
- the PR head is pinned before auto-merge is requested;
- the public default branch and its exact bytes are re-read after merge; and
- the local owned record is the last write, so it cannot claim a fork that was
  not verified.

The local Registry contains one owned record, is created atomically with mode
`0600`, and fails closed on malformed or pre-existing state. Init does not clone
the fork, create a Bean, activate a conversation target, or cache external
content.

After the fork exists, a later failure is explicit partial state. The result
names the last failed stage; Init never deletes or silently recreates the public
fork as recovery.

### Current host and credential boundary

The production adapter targets a local Codex environment with Node.js 24 and an
authenticated `gh` executable. It invokes `gh` directly without a shell and does
not read, store, print, or forward GitHub tokens. Preflight requires the
authenticated login to match the requested owner.

No current code claims equivalent behavior on ChatGPT Work, Codex Cloud, mobile,
or another host. A new surface needs its own persistence, consent, credential,
isolation, and live integration evidence.

## Standard Roastery data boundary

The official Roastery seed is public, forkable, and Bean-free. A personal fork
uses one canonical data root:

```text
roastery/
├── roastery.json
├── index.json
├── CONTENT_LICENSE.md
└── beans/
```

- `roastery.json` is the sole downstream pin to the exact Standard contract.
- `index.json` is a deterministic projection and bounded Bean allowlist, not an
  independent knowledge source.
- `CONTENT_LICENSE.md` is the validated owner-attributed declaration for Bean
  content.
- `beans/` contains owner-reviewed Markdown records when later publication
  behavior exists.

An **Origin** is a canonical public HTTPS URL recorded as provenance. It is not
a copied source body, a generated summary, or part of the Bean-content license.
A **Bean** is the owner's reviewed expression. Its narrow frontmatter and body
are governed by the vendored contract, not by arbitrary repository prose.

Fetched source bodies, generated summaries, embeddings, retrieval traces,
conversation history, and model output are not canonical Roastery records. They
cannot become a Bean through placement in a repository or appearance in a
conversation.

### Contract supply-chain boundary

The package vendors one closed Roastery contract bundle and records every
expected byte digest. Builds and tests verify the bundle, contract commit,
contract digest, seed commit, and seed tree. Runtime code imports only that
vendored surface; it never trusts whichever code happens to exist in a sibling
checkout or on the current remote default branch.

Changing the contract pin is therefore a deliberate product supply-chain change.
It must update the authority record, vendored bytes, compatibility evidence, and
product tests together. A personal Roastery does not silently migrate when the
Plugin package changes.

## Deferred read and generation architecture

No current capability fetches a public Roastery, reads a Bean body, builds model
context, or emits Coffee. The following is the minimum architecture that later
Sync, Brew, Talk, Work, or Blend behavior must satisfy before its state can
change to `available`:

```text
explicit user-selected repository and role
  -> resolve an immutable public commit
  -> enforce network, redirect, size, and resource limits
  -> fetch only contract-allowed paths
  -> validate bytes against the trusted contract
  -> create a role-separated, commit-pinned snapshot
  -> select the minimum relevant Beans
  -> construct bounded untrusted model context
  -> generate with disclosure, Bean attribution, and abstention
```

The offline contract validator checks canonical URL syntax but does not perform
network access. A future network consumer must independently prevent private or
special-use network access, revalidate redirects, bound response sizes and
counts, and avoid executing or following repository content as instructions.

Owned and external relationships require separate namespaces and explicit roles.
A selected external Roastery is read-only. It cannot become the owned target,
write to the owned Registry record, or contribute conversation-derived material
to canonical Beans.

## Capability activation gates

The table records minimum boundaries, not a final algorithm. Each capability
requires a scoped implementation goal, tests, security evidence, and a matching
capability-contract transition.

| Capability   | Minimum behavior before activation                                                                                                                                            | Required negative boundary                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync         | Explicitly identify owned or external role, verify repository identity and immutable commit, validate the Standard contract, and record only scoped relationship state        | No ambient target, recursive repository trust, executable external content, or owned/external role conversion                                 |
| Unsync       | Preview the exact local relationship and cache state to remove, then remove only that accepted scope                                                                          | Never delete or edit a remote repository, owned Beans, Plugin files, or unrelated local state                                                 |
| Roast        | Produce a source-distinguishable Bean candidate, show exact proposed bytes and publication consequences, and use the protected Roastery publication path after owner approval | Conversation or model output never becomes a Bean automatically; rejection and stale approval preserve zero canonical writes                  |
| Brew         | Select the minimum validated, commit-pinned Bean context for a declared task and retain attribution through generation                                                        | Origin or repository prose never becomes model authority; invalid, ambiguous, or insufficient evidence causes abstention or a bounded failure |
| Coffee Chat  | Provide a disclosed AI conversation grounded in selected Beans with inspectable citations and context limits                                                                  | Never claim to be the owner, imply owner endorsement of generated wording, or mutate any Roastery from the conversation                       |
| Coffee Blend | Require explicit selection of every contributing Roastery and preserve per-Bean owner and commit attribution                                                                  | Never collapse multiple owners into one identity, policy, or unattributed voice                                                               |

Availability is atomic at the product-contract boundary. Partial helpers, design
prose, mocked tests, or an evaluator adapter do not justify changing a
capability from `not_implemented`.

## State and lifecycle separation

The host owns installation, uninstallation, conversations, compaction,
retention, archive, deletion, and process lifetime. Coffee Chat owns only its
declared product state.

- `install` and `uninstall` refer to the Plugin package.
- `sync` and `unsync` refer to future Roastery relationships.
- Installing or updating the package must not create or mutate a Roastery.
- Uninstalling the package is not evidence that a public fork, local Registry,
  or future cache was removed.
- Starting, resuming, copying, compacting, archiving, or ending a conversation
  must not select a target or mutate relationship state.

The current package has no lifecycle hook, background process, or ambient
activation mechanism. Later work must preserve that state independence unless a
new host capability and product decision are explicitly reviewed.

## Trust and security model

| Input or actor                                       | Trust granted                                                                  | Trust withheld                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Packaged Coffee Chat code                            | Product behavior only after release and verification controls                  | No authority beyond declared capability and user acceptance                                      |
| Vendored Roastery bundle                             | Closed parser, renderer, validator, and contract bytes after hash verification | No trust in sibling checkout state or arbitrary bundled prose                                    |
| Owner acceptance                                     | Authority for the exact previewed operation                                    | No authority for a changed target, stale bytes, later operation, or broader scope                |
| GitHub and `gh` results                              | Provider evidence that must be structurally and semantically revalidated       | No assumption that a successful exit or connected account proves ownership intent or final state |
| Roastery, Bean, Origin, declaration, and event bytes | Untrusted data within bounded parsing and citation paths                       | No execution, tool use, credential access, policy control, or write authority                    |
| Model output                                         | Candidate text requiring disclosure and downstream validation                  | No owner authority, canonical record status, or proof of factuality                              |

Security-sensitive changes are governed by [`SECURITY.md`](../../SECURITY.md)
and repository policy. A later capability cannot weaken Preview binding,
protected publication, trust separation, or current zero-write negative paths to
make implementation easier.

## Verification and claim ownership

Coffee Chat keeps four evidence layers separate:

1. **Product tests** prove deterministic package mechanics and synthetic
   boundaries for the exact source tree.
2. **Live integration evidence** proves a declared provider and host surface at
   an exact version and commit.
3. **Evaluator evidence** observes a pinned package as an external candidate
   under a declared harness, model, and isolation boundary.
4. **Benchmark evidence** supports a candidate-independent construct, control,
   measure, and validity argument.

A green product test does not prove live GitHub availability. Connectivity does
not prove product behavior. Product behavior does not prove utility. A score
does not prove that the benchmark measures owner-grounded judgment rather than
retrieval, style, or information access.

Future Talk and Work claims should preserve at least source-only and
matched-information controls, owner-specific fidelity evidence, factual
grounding, Bean attribution, context limits, and non-impersonation checks as
described in the [product thesis](../../PRODUCT-THESIS.md).

## Change rules

- A capability becomes available only when its machine contract, runtime, Skill
  entrypoint, negative paths, security evidence, tests, and user-facing status
  change together.
- Both Plugin manifests and the capability contract project one CalVer. An
  external protocol or contract version does not create a second product
  identity.
- A Roastery contract change updates the exact pin and vendored evidence; it is
  never discovered implicitly at runtime.
- Product-purpose or research changes belong in `PRODUCT-THESIS.md`. Current
  availability belongs in `docs/product-boundaries.md` and the machine contract.
  Cross-component behavior belongs here.
- Eval and benchmark results stay in their owning repositories and are linked by
  immutable evidence rather than copied into product status prose.
- Deferred decisions remain deferred until the responsible implementation and
  evidence are reviewed. They must not be filled in from older coordination
  notes or another checkout.
