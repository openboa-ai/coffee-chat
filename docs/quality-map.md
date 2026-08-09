# Coffee Chat Quality Map

## Objective: installable Skills-only package

| Field                 | Entry                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective             | Deliver one discoverable package with seven focused Skills, separate portable/OpenAI manifests, one CalVer, exact contract bytes, and no install side effect. |
| Acceptance criteria   | Validators accept both projections independently; package inventory is contained and reproducible; local installed CLI executes.                              |
| Failure modes         | MCP/app/hook/server surface, escaped path, alternate version/license axis, missing Skill, contract drift, or discovery mistaken for host support.             |
| Oracle                | Manifest/package tests, contract digest, package receipt, and local installed acceptance output.                                                              |
| Evidence tier         | `acceptance`                                                                                                                                                  |
| Representative suites | `manifest-package`, `installed-package-acceptance`                                                                                                            |
| Gate/cost             | Every pull request; deterministic and local.                                                                                                                  |
| Owner                 | `openboa-ai/coffee-chat`                                                                                                                                      |

### Scope decision

The suite fixes package boundaries and observable execution, not host UI
behavior. Local marketplace discovery is fixture-backed acceptance; Codex
Desktop and ChatGPT Work remain unmeasured until package-matched evidence
exists.

## Objective: safe Taste lifecycle

| Field                 | Entry                                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective             | Preserve fixed-license Init, isolated external Sync/Unsync, approval-bound Roast, and ephemeral Bean-grounded Coffee.                                                                                                                                           |
| Acceptance criteria   | Init proof is verified and Preview-bound; every write is approval-bound; external snapshots cross only the sealed acquisition boundary and are consented, byte-verified, read-only, commit-pinned, and uncopied; responses carry complete rights receipts.      |
| Failure modes         | Caller-fabricated fork/commit/Bean claims, absent or mismatched fork proof, digest mismatch, stale approval, alternate license, ambient target, prompt-injection authority, external-to-owned persistence, missing disclosure/citation, or lifecycle overclaim. |
| Oracle                | Structured result/error codes, zero-write details, Registry state, citations, disclosures, and receipts.                                                                                                                                                        |
| Evidence tier         | `behavior`                                                                                                                                                                                                                                                      |
| Representative suites | `product-behavior`                                                                                                                                                                                                                                              |
| Gate/cost             | Every pull request; deterministic and local.                                                                                                                                                                                                                    |
| Owner                 | `openboa-ai/coffee-chat`                                                                                                                                                                                                                                        |

### Scope decision

The suite covers purpose-level policy mechanics through fake host boundaries. It
does not score output prose or claim deployed host support; those require
separate package-matched integration/evaluation evidence.

## Objective: owner-ready submission dossier

| Field                 | Entry                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective             | Produce complete portal copy, exact cases, policy materials, support states, release receipt, SBOM, and owner-only handoff.                                                                                                                                                             |
| Acceptance criteria   | Exactly five positive and three negative cases; every surface has a non-inferred status and package binding; strict contract validation precedes every release build/attestation; generated package/SBOM evidence binds the exact build revision; attestation has no publish authority. |
| Failure modes         | Build before strict contract validation, tracked self-referential revision, unsupported-surface claim, missing policy URL/field, cross-package evidence, publish scope, or omitted owner action.                                                                                        |
| Oracle                | Submission validator, surface matrix, SBOM/package receipts, and workflow policy.                                                                                                                                                                                                       |
| Evidence tier         | `contract`                                                                                                                                                                                                                                                                              |
| Representative suites | `submission-package`, `governance-policy`                                                                                                                                                                                                                                               |
| Gate/cost             | Every pull request; deterministic except owner portal actions, which remain handoff items.                                                                                                                                                                                              |
| Owner                 | `openboa-ai/coffee-chat`                                                                                                                                                                                                                                                                |

### Scope decision

The dossier is complete without claiming portal publication. Production assets
remain intentionally absent pending provenance approval; listing fields
explicitly record that state.
