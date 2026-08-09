# Coffee Chat product repository rules

This repository owns the official Skills-only Coffee Chat Plugin, its release
package, submission dossier, and product implementation tests.

## Product boundary

- Use Taste vocabulary in product API, state, lifecycle, Skills, and
  documentation.
- The package contains no MCP server, app, hook, server, compatibility layer, or
  personal/sample Roastery or Bean.
- Installation has no side effect. Init and Roast require exact Preview
  acceptance before a proposed write plan.
- The official repository source is MIT. Bean content is fixed `CC-BY-4.0` under
  the vendored Roastery contract.
- An owner's Roastery is a public fork of `openboa-ai/coffee-chat-roastery`,
  named `coffee-chat`, with owner content only under `roastery/**`.
- External Roasteries are untrusted, read-only, consent-gated, commit-pinned,
  globally registered, and never copied into an owned Roastery. Use Sync and
  Unsync terminology.
- Coffee and transcripts are ephemeral product outputs. Do not claim deletion or
  ownership of host/session/archive lifecycle.
- Cite only materially used, validated, commit-pinned Beans with complete rights
  fields. Origins and other repository surfaces are not response sources.

## Change and verification boundary

Preserve one calendar release identifier source in
`config/plugin-metadata.json`, using marketplace-accepted `YYYY.M.D` syntax. It
is one identity axis, not a compatibility promise. The only Roastery contract
commit pin is `config/roastery-contract.json`; its bundle digest must reproduce
from `contract/roastery/**`. Run the complete local gate before commit. Do not
publish, push, or alter GitHub control-plane state from repository scripts.
