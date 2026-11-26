<img src="https://raw.githubusercontent.com/openboa-ai/yogurt/main/design/assets/projects/coffee.svg" alt="Coffee Chat project mark" width="96">

# coffee-chat

ground for good taste

Coffee Chat is an OpenBoa project for capturing a person’s explicitly confirmed perspective and applying it reliably across human collaboration and agent judgment. Rather than summarizing everything or guessing hidden traits, Coffee Chat distinguishes raw source facts from a person’s reviewed viewpoint (`Origin → Roast → Bean → Brew → Coffee`) so others and agents can act with clear, authored intent.

## Repository family

| Repository | Responsibility |
| :--- | :--- |
| **[coffee-chat](https://github.com/openboa-ai/coffee-chat)** | Product semantics, shared skills, and host/plugin integration. |
| **[coffee-chat-roastery](https://github.com/openboa-ai/coffee-chat-roastery)** | Storage, auth, ownership boundaries, and MCP data service. |
| **[coffee-chat-bench](https://github.com/openboa-ai/coffee-chat-bench)** | Independent benchmark cases, ground-truth expectations, and grading criteria. |
| **[coffee-chat-eval](https://github.com/openboa-ai/coffee-chat-eval)** | Controlled evaluation runs, comparison traces, and measured evidence. |

## Development status & entry

This repository currently holds the verified CI and security baseline while scoped product specifications and runtime deliverables are brought forward. CI checks workflow syntax, whitespace, and secrets; these checks do not validate product behavior.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the supported development workflow and [docs/engineering/reusable-baseline/spec.md](docs/engineering/reusable-baseline/spec.md) for the installed baseline CI contract.
