# Contributing

Coffee Chat currently provides a repository foundation. Product planning,
requirements and implementation remain pending. Repository hygiene checks do not
establish product correctness.

This guide follows the [scoped specification](docs/engineering/development-workflow/spec.md)
and the protected default branch's [Hydra contract](.hydra.toml). The registered
delivery boundary covers `CONTRIBUTING.md`, `README.md` and
`docs/engineering/development-workflow/`. Product code, dependencies, credentials,
deployment, policy and evaluator changes are outside this documentation boundary.

## Prepare a bounded Issue and specification

Start with the intended outcome, allowed scope, authority and data boundaries,
failure/recovery behavior, compatibility and observable acceptance criteria.
Keep the specification, Issue, implementation and evidence connected. An independent
reviewer must inspect and accept the actual scoped specification revision before
dependent implementation. A commit SHA, label or progress comment alone does not
prove that review happened. If the accepted boundary changes, return to the spec.

An authorized repository writer delegates an Issue containing Goal, Scope,
Acceptance and exactly one `hydra` block. Use the registered labels:

| Label | Meaning |
| --- | --- |
| `hydra:ready` | Eligible delegated intake |
| `hydra:paused` | Stop new work until the pause is removed |
| `hydra:decision` | A decision is required before continuation |
| `hydra:active` | Hydra-managed unfinished work or completion recovery |

The following is illustrative Issue-body Markdown, not a shell command or a new
delegation. Replace its goal and acceptance with the actual authorized change and
use its real scoped spec. Do not edit an active Issue's bound title/body to expand
scope; preserve the checkpoint and use a new Issue for a changed outcome.

````markdown
## Goal
Make the supported documentation workflow easy to follow.

## Scope
Update CONTRIBUTING.md, one README link and
docs/engineering/development-workflow/. Keep product planning pending.
Do not change policy, workflows, ownership, security instructions or product code.

## Acceptance
- Independently accept the actual scoped spec before implementation.
- Match examples to the installed native tools, CLI and registered labels.
- Pass registered local verification and independent diff/evidence review.
- Resolve authenticated Code Review and Security Review findings for the final head.
- Require current CI, protected exact-head merge and both main checks before closure.

```hydra
spec = "docs/engineering/development-workflow/spec.md"
dependencies = []
priority = 0
```
````

## Use native Codex first

Use the installed Hydra skill and five tools, following the delivered
[native setup and recovery guide](https://github.com/openboa-ai/hydra/blob/0e6bdb9287ca893fa1dd5809ea5c18bff28927b4/docs/native-codex.md).
Codex performs the bounded specification, implementation and independent judgments;
Hydra owns workspace coordination, checkpoint commits, publication and delivery.

1. Call `hydra_status` to reconcile existing work and prioritize recovery or pending
   delivery before new intake.
2. Call `hydra_begin` with the actual delegated `issue_url`. For example,
   `https://github.com/openboa-ai/coffee-chat/issues/123` is illustrative: replace
   `123` with the real Issue number before use.
3. For `action=native_task`, retain the returned `attempt_id`, `step_id`, `head`,
   `contract_revision`, `cwd`, `phase`, `mode` and prompt. Work only in that owned
   checkout and respect read-only review phases. Independent reviewers inspect
   the actual specification or diff and verification output.
4. Submit `hydra_checkpoint` with that exact Issue/attempt/step/head/contract
   identity and `candidate_ready`, `failed` or `needs_decision`. Include a concise
   factual summary. `candidate_ready` is a phase judgment, not PR acceptance or
   delivery. Do not replay a consumed step or commit/push through another path.
5. Follow the returned assignment or continue with `hydra_verify` and
   `hydra_deliver`, passing `issue_url`, `attempt_id`, `head` and
   `contract_revision` from the latest response. A write checkpoint can return a
   new head; do not reuse its pre-edit head. These tools may return further work,
   a recoverable wait, or observed delivery.

Keep the outcome visible in its native Codex task and linked to the Issue. Separate
tasks or messaging require the user's delegation; do not create duplicate writers
or an extra execution loop. Use independent review judgments in addition to the
authenticated PR reviews required below.

## Verify, review and deliver

For a checkpointed candidate, the exact registered local command is:

```sh
git diff --check --no-ext-diff --no-textconv origin/main HEAD --
```

Hydra runs this through the installed host resource provider in the owned worktree.
It compares committed content, so running it before checkpointing does not validate
uncommitted edits. It checks whitespace only. Preserve the actual result and have
an independent reviewer inspect the complete diff, changed paths, accepted
requirements and verification evidence before publication.

| Evidence | What it establishes |
| --- | --- |
| Accepted scoped spec | The reviewed change boundary and acceptance criteria |
| Registered local result | Whitespace result for the checkpointed candidate |
| Independent diff/evidence review | A separate judgment of the actual candidate |
| Current PR CI | Required trusted producers/workflows passed for the current candidate and base |
| Authenticated Code Review and Security Review | Both provider reviews completed for the final head and substantive findings were resolved |
| Native policy review | Required current-head human review when policy or ownership changes |
| Protected merge | GitHub actually merged the exact reviewed head under current requirements |
| Main observation | Both required push checks succeeded for the resulting merge commit |

The two registered jobs are `Repository baseline` and
`trusted-baseline / Trusted repository baseline`. The
[CI contract](docs/engineering/reusable-baseline/spec.md) describes workflow syntax,
whitespace and secret checks. Hydra checks configured workflow identities, events,
producer identity and the trusted reusable-workflow revision; a green check with
a matching display name is insufficient. These baseline checks do not test product
behavior or establish a runtime deployment.

Hydra publishes one coherent PR, waits for actual final-head Code Review and
Security Review from the registered provider, and checks current required CI.
Address substantive findings on the same owned branch and obtain evidence for the
updated head. A local reviewer or model success message does not replace those
remote reviews. Existing GitHub requirements still apply. Policy, CODEOWNERS and
protected-control changes require current-head native human review; this ordinary
documentation change adds no blanket human approval step and grants no exception.

Completion requires an observed protected merge of the exact reviewed head,
successful original and trusted main-push checks for the resulting commit, then
Issue closure and normal owned-worktree retirement. PR creation, an accepted merge
request, a pending merge or disabled automatic delivery is not completion. Report
local results, PR reviews/checks, merge and main results separately. This guide
does not establish full unattended operation.

## Questions, waits and recovery

For an actual purpose, product, authority or policy decision, checkpoint
`needs_decision` before asking the exact question in the native task. Preserve the
returned identity. Record only the publishable actual answer in the Issue; an
authorized actor records `hydra: decision ATTEMPT_UUID resolved`, replacing
`ATTEMPT_UUID` with that attempt's identifier. Resume by reconciling current state.
A chat answer, permission dialog and GitHub human approval are distinct mechanisms.

Paused/closed Issues and expired heartbeats do not prove an active assignment has
stopped or release its admission ticket. Inspect and stop the original task and
its owned processes before submitting `stopped` with its original exact identity.
Preserve edits; never infer termination from a restart or begin a competing worker.
Decision and remote review/CI waits can release capacity after the checkpoint and
assignment end are confirmed. Use the returned native continuation with bounded
waits rather than repeatedly launching workers.

Missing verification, changed policy or head, unavailable host resources and
ambiguous remote writes require a recoverable wait. Reconcile actual branch, PR,
review and CI state before retrying; do not create a replacement PR because a
response was lost. A failed check returns to correction on the same owned branch.
Preserve unknown processes and unrelated work. Report a runtime/policy gap without
patching Hydra or weakening repository gates from a documentation Issue. Keep
private host paths, transcripts, research records and credentials out of public
files, summaries and examples.

## Standalone alternative

The installed CLI also supports this read-only status command:

```sh
hydra status --repos openboa-ai/coffee-chat
```

For supervised `hydra run --issue ...` or `hydra serve --repos ...`, use the
delivered [standalone CLI instructions](https://github.com/openboa-ai/hydra/blob/0e6bdb9287ca893fa1dd5809ea5c18bff28927b4/README.md#standalone-cli)
and [host prerequisites](https://github.com/openboa-ai/hydra/blob/0e6bdb9287ca893fa1dd5809ea5c18bff28927b4/docs/registration.md#host-prerequisites).
Issue numbers, workspace paths and host aliases in those examples are illustrative
and must be replaced with the operator's approved installed values. Native and CLI
operation must share the same owned workspace root and lock; retain the installed
lifecycle/storage providers. Do not launch CLI work alongside an unresolved native
assignment. No new software, scheduler or operating database is needed for this
documentation change.
