---
name: roast
description:
  Propose one new Bean in the owner's Roastery through an approval-bound branch
  and pull request. Use when the user asks to Roast, publish, or save one piece
  of their Taste.
---

# Roast

Propose one owner-authored Bean per operation.

## Input

Accept text or a supported local source transformed into one Bean. Require owner
attribution, the exact owned Roastery head, and owner authority to distribute
the result under the fixed Bean license.

## Steps

1. Reject external-to-owned persistence and third-party material needing extra
   attribution or prior-change metadata.
2. Stage outside the clone and run `scripts/run.mjs` to create one UUIDv7 Bean
   Preview and change-set digest.
3. Make zero repository writes until the user accepts the exact Preview and
   distribution attestation.
4. Re-check head equality, then execute one branch and one pull request.
   Completion status is `proposed`, not published.

## Output

Return Bean bytes, Preview digest, attestation, head, branch/pull-request
result, and `proposed` status.

## Failure boundary

Stale Preview/head, missing rights, additional third-party obligations, multiple
Beans, or an external source causes zero owned-Roastery writes. Origin URLs and
resources are excluded.

See [publication-boundary.md](references/publication-boundary.md).
