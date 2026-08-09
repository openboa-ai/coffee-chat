# Coffee Chat product repository rules

This repository currently owns the clean migration shell for the official
Skills-only Coffee Chat Plugin. Product mechanics remain deferred to the later
product implementation Goal.

## Shell boundary

- Keep portable root plugin.json and OpenAI .codex-plugin/plugin.json as
  separate projections of config/plugin-metadata.json.
- Keep exactly seven capabilities: init, sync, unsync, roast, brew, coffee-chat,
  and coffee-blend.
- Every capability must return explicit "not_implemented" and perform no
  network, filesystem, Git, GitHub, Registry, cache, model, host, or publication
  operation.
- The Plugin lifecycle uses install and uninstall. Roastery relationships use
  sync and unsync.
- Add no MCP component, app, hook, embedded Roastery, evaluation or benchmark
  runtime, compatibility layer, sample data, or second release identity.
- Official source is MIT with Openboa AI copyright. Bean content policy belongs
  to the Roastery repository.
- Do not describe this shell as implemented product behavior, supported host
  integration, or measured performance.

## Verification

Run "npm run verify" and "git diff --check". Do not publish, push, mutate a
remote, or alter GitHub settings from repository scripts.
