# Coffee Chat

Coffee Chat is a Codex-first, Skills-only Plugin for public Roastery journeys.
This CalVer implements the first bounded producer flow: **Build mine / Init**.
It keeps Sync, Unsync, Roast, Brew, Coffee Chat, and Coffee Blend visibly
unavailable until later objective-driven work implements them.

Installation itself has no data or repository side effect. The package contains
no MCP server, app, hook, personal Roastery, sample Bean, evaluator, or
benchmark runtime.

## Build mine

Init creates an owned public Roastery only after two explicit steps.

1. Preview the immutable official seed, target `<owner>/coffee-chat`, fixed CC
   BY 4.0 declaration, seven publication notices, rights attestation, protected
   branch/PR path, Registry timing, and recovery boundary.
2. Apply only after the user accepts that exact Preview digest and makes the
   displayed rights-authority attestation.

```sh
cd skills/init

node scripts/run.mjs preview \
  --owner example \
  --attribution "Example Owner"

node scripts/run.mjs apply \
  --owner example \
  --attribution "Example Owner" \
  --decision accept \
  --preview-digest sha256:<exact-preview-digest> \
  --rights-attested
```

The accepted path verifies the authenticated GitHub owner, forks only
`openboa-ai/coffee-chat-roastery` at the pinned Bean-free seed, enables the
Standard Roastery ruleset and required CI, proposes owner identity and
`roastery/CONTENT_LICENSE.md` through a pull request, requests GitHub-native
squash auto-merge, reverifies public `main`, and only then writes one owned
Registry record.

Rejection, cancellation, invalid attribution, stale Preview, alternate-license
input, and failed preflight make no GitHub or Registry write. Once the public
fork is created, a later failure is reported as partial external state; Init
never deletes the repository implicitly.

Requirements for apply are Node.js 24, an authenticated GitHub CLI, and
administration permission for the authenticated user's own public fork. Current
PR evidence is deterministic and synthetic; live Codex-host support remains
unmeasured until its separate isolated gate runs.

## Immutable Roastery authority

The package vendors the exact Standard Roastery package from contract commit
`d7d770af59a691b5ebceee9809ab436f32db33d5` and verifies every vendored file plus
the canonical digest
`sha256:878704aa835d167ea6ef6979f7cd0258cf02476b3f7c16926779f4f18ce75428`. The
official fork-ready seed is pinned at
`8b196137ca22d6e5bcf373424d32cc95fb41bcf2`. Runtime never imports a sibling
checkout and no alternate executable pin exists.

## Other journeys

The package discovers all seven branded Skills so future entrypoints are stable,
but the other six return `not_implemented` and perform no network, filesystem,
GitHub, Registry, model, cache, or publication action. In particular, **Talk
now** and actual Coffee conversations are not implemented by this slice.

Plugin lifecycle terms are `install` and `uninstall`. Roastery relationship
terms are `sync` and `unsync`; they never describe Plugin installation.

## Verification and licensing

```sh
npm ci
npm run verify
git diff --check
```

Official Plugin source is [MIT licensed](LICENSE), Copyright (c) 2026 Openboa
AI. Personal `roastery/beans/**` content uses the fixed CC BY 4.0 declaration
owned by the Standard Roastery contract; Origin URLs and resources remain
outside that grant.
