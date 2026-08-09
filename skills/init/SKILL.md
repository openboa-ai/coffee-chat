---
name: init
description:
  Initialize an owner's public Coffee Chat Roastery from the official fork seed.
  Use when the user asks to start, initialize, or set up their own Roastery.
---

# Init

Create a write plan only after the owner accepts the exact fixed-license
Preview.

## Input

Require the owner's attribution name, HTTPS attribution URL, GitHub owner, and
the public `coffee-chat` fork URL. Do not ask for a content-license choice.

## Steps

1. Preflight the host's ability to create or inspect a public fork, protected
   branch, and pull request. If any capability is unavailable, return
   `unsupported_surface`.
2. Through the trusted in-process acquisition boundary, verify that the target
   is public, named `coffee-chat`, and is a fork whose parent is exactly
   `openboa-ai/coffee-chat-roastery`. Never accept caller-provided JSON as that
   proof.
3. Bind the verified repository, parent, visibility, default branch, and exact
   observed commit proof into the Preview digest. Run the packaged Init runtime
   only in the same trusted process; the JSON launcher cannot carry this proof.
4. Render the fixed `CC BY 4.0` declaration, notice semantics, file bytes, and
   digest.
5. Show the exact Preview and rights attestation. Make no write before explicit
   acceptance of that digest.
6. After acceptance, run `accept-init`. Execute the returned protected-branch
   pull-request plan only with the user's current write approval.

## Output

Return the Preview or approved plan, its digest, and the actual host result.
Installation itself never initializes a Roastery.

## Failure boundary

Absent, stale, or mismatched fork proof; cancellation; invalid attribution;
alternate license input; stale Preview; or missing host capability produces no
branch, pull-request, Registry, or file writes. Never infer fork ancestry from a
URL or claim ownership of host or session-end lifecycle.

See [fixed-license.md](references/fixed-license.md).
