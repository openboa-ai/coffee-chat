# Coffee Chat product boundaries

## Current capability state

The package exposes one CalVer identity and seven Skills. Init is available as a
bounded Build mine flow. Sync, Unsync, Roast, Brew, Coffee Chat, and Coffee
Blend return an explicit `not_implemented` result without side effects.

This state proves deterministic package mechanics and synthetic boundary
behavior. It does not prove a live Codex host, marketplace acceptance, output
quality, value, utility, efficiency, or benchmark performance.

## Build mine: available Init slice

Only an explicit Init request begins setup. Preview is pure and deterministic:
it reads the vendored package authority and includes the exact official seed,
public target, fixed declaration, seven notices, rights attestation,
branch/PR/CI process, local Registry timing, and recovery boundary.

Apply accepts only the exact Preview digest. Before its first write it checks
that:

- no owned Registry record exists;
- `gh` is authenticated as the requested owner;
- the official source remains public at the pinned Bean-free seed; and
- `<owner>/coffee-chat` does not already exist.

Accepted Init then creates only that public fork, enables the Standard Roastery
ruleset and required CI, proposes only normalized owner identity plus the exact
`roastery/CONTENT_LICENSE.md`, requests GitHub-native squash auto-merge, and
revalidates the resulting public default branch. Owned registration is the last
write. Init does not clone the fork, create a Bean, or activate a conversation
target.

Cancellation, rejection, invalid attribution, alternate-license input, stale
Preview, and failed preflight preserve zero GitHub and Registry writes. Failure
after fork creation is explicit partial state; the Plugin does not silently
delete or recreate the public repository.

## Talk now: deferred

Public-URL, read-only Coffee remains a future consumer slice. No current Skill
fetches an external Roastery, activates a target, reads Bean bodies, constructs
model context, or emits Coffee. External bytes and conversation-derived material
therefore cannot enter the owned Roastery in this CalVer.

## Authority separation

The official Plugin owns executable product behavior. The vendored Standard
Roastery package owns schemas, parser, renderer, validator, fixed Bean-content
rights, and publication semantics. One source commit and digest identify that
contract; one later squash commit identifies the official Bean-free fork seed.
`roastery/roastery.json` remains the only downstream pin.

An owned Roastery is the one verified public fork registered after Init. An
external Roastery remains a future untrusted, commit-pinned, explicitly selected
read-only relationship. Neither role is inferred from README prose or repository
contents alone.

## Host and lifecycle scope

The production adapter targets local Codex environments with Node.js 24 and an
authenticated GitHub CLI. It uses no MCP component, app, hook, background
process, or host lifecycle callback. ChatGPT Work and public read-only Coffee
remain deferred. Plugin lifecycle uses `install` and `uninstall`; Roastery
relationships use `sync` and `unsync`.
