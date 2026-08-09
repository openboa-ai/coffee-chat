# Coffee Chat Quality Map

## Objective: discoverable Plugin shell

| Field                 | Entry                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Objective             | Expose one CalVer identity through separate portable and OpenAI manifests and seven discoverable Skills.     |
| Acceptance criteria   | Shared identity fields match; both manifest projections remain distinct; every Skill has one fixed launcher. |
| Failure modes         | Identity drift, missing capability, alias surface, or undeclared package component.                          |
| Oracle                | Parsed manifests and discovered package paths.                                                               |
| Evidence tier         | Contract                                                                                                     |
| Representative suites | tests/plugin-shell.test.mjs                                                                                  |
| Gate/cost             | Local and pull request; fast                                                                                 |
| Owner                 | openboa-ai/coffee-chat                                                                                       |

## Objective: honest deferred behavior

| Field                 | Entry                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Objective             | Keep all seven capabilities explicitly deferred and side-effect-free.                                            |
| Acceptance criteria   | Every command returns the same closed machine-readable status and leaves an empty temporary directory unchanged. |
| Failure modes         | False success, nondeterminism, network or write authority, or hidden product mechanics.                          |
| Oracle                | Process result, exact structured output, and filesystem observation.                                             |
| Evidence tier         | Behavior                                                                                                         |
| Representative suites | tests/plugin-shell.test.mjs                                                                                      |
| Gate/cost             | Local and pull request; fast                                                                                     |
| Owner                 | openboa-ai/coffee-chat                                                                                           |

## Objective: isolated package check and lean CI

| Field                 | Entry                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Objective             | Check the shell package in temporary storage and retain no generated artifact.                                               |
| Acceptance criteria   | Package smoke leaves the worktree unchanged; quality, dependency review, and CodeQL workflows satisfy policy.                |
| Failure modes         | Forbidden package content, false readiness, unpinned Actions, privileged candidate execution, or non-squash merge authority. |
| Oracle                | Worktree status, package smoke execution, and parsed workflow policy.                                                        |
| Evidence tier         | Acceptance                                                                                                                   |
| Representative suites | tests/package-archive.test.mjs, tests/workflow-policy.test.mjs                                                               |
| Gate/cost             | Local and pull request; fast                                                                                                 |
| Owner                 | openboa-ai/coffee-chat                                                                                                       |
