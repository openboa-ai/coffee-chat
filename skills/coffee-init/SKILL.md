---
name: coffee-init
description:
  Build the user's owned public Roastery from the immutable official seed. Use
  when the user explicitly asks to initialize or build their own Roastery.
---

# Init

status: available

Init is a two-step, exact-Preview workflow. It is available only on a local
Codex surface with authenticated GitHub CLI access and repository-administration
permission for the user's own account.

## 1. Preview without writes

Collect only the authenticated GitHub owner and the owner's attribution. Run:

```sh
node scripts/run.mjs preview --owner <owner> --attribution <attribution>
```

Show the complete returned Preview to the user, including source and target,
public visibility, exact seed and contract identities, rendered declaration and
digest, all seven notices, publication path, local Registry timing, rights
attestation, and recovery boundary.

Do not shorten the Preview or treat prior general agreement as acceptance. Do
not offer CC0, custom, alternate-license, private-repository, unrelated-repo, or
direct-main alternatives.

## 2. Apply only after explicit acceptance

Ask whether the user accepts that exact Preview and makes the displayed
rights-authority attestation. Rejection or cancellation must be passed through
as the matching decision and makes no external write.

Only an explicit acceptance may run:

```sh
node scripts/run.mjs apply --owner <owner> --attribution <attribution> \
  --decision accept --preview-digest <exact-preview-digest> \
  --rights-attested
```

Init then performs read-only preflight, forks only the immutable official seed
to `<owner>/coffee-chat`, enables the Standard Roastery protection and CI
contract, proposes only owner identity plus `roastery/CONTENT_LICENSE.md` on a
branch and pull request, requests GitHub-native squash auto-merge, verifies the
public default branch, and only then writes one owned Registry record.

Report the returned structured status exactly. A stale Preview or failed
preflight requires a new Preview and must not be retried as an accepted write.
After fork creation, failures are partial external state and Init never deletes
the public repository implicitly.

This Skill does not create a first Bean, clone the fork, activate a target,
Sync, Roast, Brew, start Coffee Chat, run Coffee Blend, or manage host
lifecycle.
