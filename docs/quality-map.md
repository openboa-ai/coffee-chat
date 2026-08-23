# Coffee Chat Quality Map

| Objective                                     | Acceptance criteria and oracle                                                                                                                                                                                                                      | Representative evidence                                                 | Gate                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Keep one discoverable Plugin identity         | The public capability contract and portable/OpenAI manifests project one CalVer; exactly seven Skills have contained launchers and matching runtime states; discovery executes nothing; no MCP/app/hook appears                                     | `capability-contract.test.mjs`, `plugin-shell.test.mjs`                 | PR                           |
| Consume one immutable Roastery authority      | Every vendored package byte matches the closed hash manifest; the canonical bundle digest, contract squash, and later seed squash match their frozen identities                                                                                     | `contract-bundle.test.mjs`                                              | PR                           |
| Make consent observable before Init writes    | Preview deterministically binds the public target, declaration, digest, seven notices, rights attestation, publication path, local state, and recovery boundary                                                                                     | `init-acceptance.test.mjs`, `init-cli-acceptance.test.mjs`              | PR                           |
| Preserve zero writes for non-authorized paths | Rejection, cancellation, invalid attribution/owner/license input, stale Preview, Registry conflict, and GitHub preflight failure cause no fork, protection, branch, pull request, or Registry write                                                 | `init-acceptance.test.mjs`, `init-cli-acceptance.test.mjs`              | PR                           |
| Initialize through protected public state     | Only the frozen official seed is forked; the fork snapshot is verified without moving `main`; protection precedes the three-file proposal; exact head merges through required CI; public main is reverified before owned registration               | `github-boundary-acceptance.test.mjs`                                   | PR; isolated live gate later |
| Keep local owned state atomic and non-ambient | Preflight is read-only; one mode-0600 record is atomically created after verification; existing or malformed state fails closed                                                                                                                     | `registry-acceptance.test.mjs`                                          | PR                           |
| Keep unimplemented capability claims honest   | The public contract and runtime agree that Sync, Unsync, Roast, Brew, Coffee Chat, and Coffee Blend are `not_implemented`; their launchers preserve an empty workspace                                                                              | `capability-contract.test.mjs`, `plugin-shell.test.mjs`                 | PR                           |
| Keep package and CI evidence lean             | Isolated packaged Preview loads the vendored authority; package leaves no worktree artifact; one pinned target wrapper delegates policy, raw-blob secret scanning, dependency review, CodeQL, and deterministic quality to the central trusted gate | `package-archive.test.mjs`, `workflow-policy.test.mjs`, `package:smoke` | PR                           |

The fake GitHub transport proves ordering, data boundaries, and failure
classification, not live provider availability. A real personal fork, real Codex
host, marketplace submission, Coffee output quality, evaluation report, and
benchmark result require separate gates and are not inferred from these tests.

## Verification commands

```sh
npm run verify
git diff --check
```

Routine documentation-only pull requests use the approval-free lane;
`coffee-security` remains reserved for policy evolution and protected paths.
