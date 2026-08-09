# Coffee Chat

Coffee Chat is a Skills-only, Codex-first Plugin for turning public, attributed
Taste into ephemeral AI-generated Coffee. It installs without creating files,
forking repositories, or registering external sources.

The product follows a public Roastery model:

- Your Roastery is your public fork of
  [`openboa-ai/coffee-chat-roastery`](https://github.com/openboa-ai/coffee-chat-roastery),
  named `coffee-chat`.
- Your declaration and Beans live under `roastery/**` in that fork. You publish
  only content you control.
- External Roasteries are untrusted, consent-gated, read-only, and pinned to
  immutable commits. Sync accepts repository identity and Bean content only
  through the trusted acquisition boundary, which verifies public metadata,
  exact commit bytes, and index digests before context. Unsync removes only the
  relationship.
- External Beans are never copied into your Roastery. Coffee and transcripts are
  not persisted by this Plugin.
- Every materially used Bean remains visibly attributed under `CC BY 4.0`;
  generated Coffee is disclosed as AI-generated, not publisher wording or
  endorsement.

## Included Skills

`init`, `sync`, `unsync`, `roast`, `brew`, `coffee-chat`, and `coffee-blend` all
invoke the same deterministic local runtime. There is no MCP server, app, hook,
network service, or install-time action.

## Local installation and acceptance

Requirements: Node.js 24 and npm.

```bash
npm ci
npm run verify
npm run build
npm run test:acceptance
```

The repository-local marketplace is `.agents/plugins/marketplace.json`. Its
local source resolves to this Plugin root. Marketplace discovery and the
installed-package CLI test are local acceptance evidence, not proof of support
on another host surface.

The JSON CLI cannot carry trusted repository evidence. Direct external Sync and
Init therefore fail closed unless a host integration supplies the in-process
verified-acquisition boundary. Caller-provided commit, fork, declaration, index,
or Bean assertions are never accepted as proof.

`npm run release:local` remains available while the trusted Roastery commit is
pending. `npm run release:candidate` is the protected release gate: it validates
the final contract pin before any build and derives the candidate revision from
the checked-out commit instead of storing a self-referential commit in source.

## Repository and content licenses

Source code and repository documentation are licensed under the
[MIT License](LICENSE). Bean content in owner Roasteries uses the fixed
`CC BY 4.0` contract; this repository contains the exact vendored contract but
no personal or sample Beans.

See [privacy](docs/privacy.md), [terms](docs/terms.md),
[support](docs/support.md), and the [Quality Map](docs/quality-map.md).
