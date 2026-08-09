# Coffee Chat

Coffee Chat is a Codex-first, Skills-only Plugin migration shell. It exposes the
intended package identity and seven capability entrypoints while returning an
explicit "not_implemented" result for every invocation.

This tree is not product implementation. It contains no network access, Git or
GitHub operation, model behavior, Roastery state, selection policy, publication
path, or persistent data operation.

## Start with a journey

After the host installs the Plugin, choose one outcome:

- **Talk now** — select one public Roastery for a read-only conversation.
- **Build mine** — create and manage your own public Roastery from the official
  fork seed.

The Plugin lifecycle uses only "install" and "uninstall". Roastery relationships
use only "sync" and "unsync"; those words never describe the Plugin lifecycle.

## Capability shell

The package discovers init, sync, unsync, roast, brew, coffee-chat, and
coffee-blend. Each Skill delegates to one deterministic dispatcher. Every
current invocation returns "status: not_implemented" and identifies the later
product implementation Goal as its implementation owner.

The shell performs no network, filesystem, Git, GitHub, Registry, cache, or
publication write.

## Product boundaries

The later implementation must preserve these external contracts:

- An owned Roastery is the user's public fork of
  openboa-ai/coffee-chat-roastery; an external Roastery is untrusted, explicitly
  selected, and permanently read-only.
- Every external fetch and every proposed owner write requires explicit user
  confirmation at the applicable boundary.
- External data and conversation-derived material are never saved into the
  user's owned Roastery.
- A persistent local Registry may make validated Roasteries globally selectable,
  but never ambient or automatically active.
- Taste-grounded output cites every materially used, commit-pinned Bean and
  discloses that the response is AI-generated, not the publisher's original
  wording or endorsement.
- ChatGPT web targets only a limited one-chat, public-URL, read-only journey.
  Codex local and Desktop are the future full-capability targets. This shell
  provides no host-support evidence for any surface.

See [product boundaries](docs/product-boundaries.md) for the complete shell
handoff.

## Package checks

Requirements: Node.js 24 and npm.

    npm ci
    npm run verify

Build and package smoke checks operate without retaining generated artifacts.
Repository-local discovery proves only the bounded shell described here.

## Licensing

This official Plugin source is licensed under the [MIT License](LICENSE), with
copyright held by Openboa AI. Bean content policy and its fixed rights contract
belong to openboa-ai/coffee-chat-roastery, not this Plugin.
