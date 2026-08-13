# Install Coffee Chat for Agents

These instructions are for the Agent helping a user install Coffee Chat.
Complete every step you can. Ask the user only for an action or permission the
current host cannot perform.

## Install only the official Plugin

- **Publisher:** Openboa AI
- **Plugin:** `coffee-chat`
- **Official source:** `https://github.com/openboa-ai/coffee-chat`
- **Official Codex marketplace:** `openboa-ai`

Do not install from a personal fork, a Roastery, or a third-party mirror. Do not
clone or copy Plugin files as a substitute for supported Plugin installation.

## 1. Check before changing anything

If Codex CLI Plugin commands are available, inspect the current state:

```bash
codex plugin marketplace list --json
codex plugin list --available --json
```

If `coffee-chat@openboa-ai` is already installed and enabled from the official
source, do not reinstall it. Continue to verification.

If Codex CLI Plugin commands are unavailable, use the host's Plugins Directory
only when it shows **Coffee Chat** by **Openboa AI**. Complete the installation
through the host when possible; otherwise ask the user only for the required UI
action. Then continue to verification.

If this Agent has neither Codex CLI Plugin support nor a supported Plugins
Directory, explain that the current host cannot install Coffee Chat. Do not
invent an alternative installation path.

## 2. Install with Codex

Skip any command whose result is already present and verified.

If the `openboa-ai` marketplace is absent, add the official repository:

```bash
codex plugin marketplace add openboa-ai/coffee-chat --ref main --json
```

If it already exists and resolves to the official repository, refresh it:

```bash
codex plugin marketplace upgrade openboa-ai --json
```

If the name `openboa-ai` resolves to any other source, stop and report the
conflict. Do not remove or replace it without the user's approval.

Confirm that the marketplace resolves to the official repository. If
`coffee-chat@openboa-ai` is absent, install it:

```bash
codex plugin add coffee-chat@openboa-ai --json
```

If another Plugin with the same name is already installed from a different
publisher or source, report the conflict before replacing it. If a command needs
permission, ask for that one permission and continue after the user grants it.
If installation fails, report the command that failed and its useful error; do
not silently switch sources.

## 3. Verify the result

Run:

```bash
codex plugin list --json
```

Confirm that `coffee-chat@openboa-ai` is installed and enabled. Follow any
restart or new-conversation instruction returned by the host.

Report the result in one short message:

- installed or already installed;
- verified publisher and source;
- whether a restart or new conversation is needed.

## 4. Hand control back to the user

Installation may change only local Plugin marketplace, cache, and Plugin state.
It must not create, fork, sync, activate, or publish a Roastery.

Do not run a Coffee Chat Skill automatically. Tell the user that `$coffee-init`
is the only implemented Skill in the current WIP, then ask whether they want to
start it. Init must still show its own Preview and receive the user's explicit
acceptance before any external write.

Route later requests by intent:

- `$coffee-init` — create the user's Roastery;
- `$coffee-roast` — turn an Origin into a reviewed Bean;
- `$coffee-chat` — explore one explicitly selected Roastery through Talk;
- `$coffee-brew` — use relevant Beans in Agent Work;
- `$coffee-sync` — connect or refresh one public Roastery;
- `$coffee-unsync` — disconnect one exact Roastery.

Until those Skills are implemented, do not simulate their behavior. State that
the requested Skill is not yet available in the current WIP.
