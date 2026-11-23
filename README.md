# Coffee Chat

Knowledge is shared. What a person makes of it is personal.

Coffee Chat lets you capture author-confirmed perspectives from reading or real work decisions and reuse them across agent work and human conversation. Perspectives stay private by default, preserve source facts separately from personal trade-offs and boundaries, and connect to any compatible agent host through universal Agent Skills, OAuth 2.1 MCP, interactive MCP Apps, and a Zero-AI web home.

## Quick start

- Product intent: [docs/intent.md](docs/intent.md)
- Technical specification: [docs/spec.md](docs/spec.md)
- First-loop acceptance contract: [docs/acceptance/first-loop/spec.md](docs/acceptance/first-loop/spec.md)
- Current verified status: [docs/status.md](docs/status.md)

## Monorepo layout

| Path | Responsibility |
| --- | --- |
| `packages/core` | Domain models, URL normalizer, RFC 8785 JCS digest, Drizzle Postgres schema (Neon + PGlite), privacy and concurrency services |
| `packages/ui` | Shared `@openboa/yogurt` presentation components used by Web and MCP Apps |
| `packages/mcp-apps` | Self-contained `text/html;profile=mcp-app` interactive widget bundles |
| `apps/web` | Next.js App Router Zero-AI web home, Better Auth, and OAuth 2.1 `/api/mcp` Streamable HTTP endpoint |
| `skills/` | Host-neutral `SKILL.md` definitions (`roast`, `brew`) and host packaging manifests |
| `evals/` | Candidate-independent Taste evaluation harness and 6 frozen core scenarios |

## Local development

```sh
npm install
npm run build:mcp-apps
npm test
npm run check:yogurt
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and review expectations.
