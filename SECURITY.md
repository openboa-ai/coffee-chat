# Security policy

## Reporting

Report suspected vulnerabilities privately through GitHub's security-advisory
interface for `openboa-ai/coffee-chat`. Do not include secrets, private Beans,
or personal data in a public issue. General support belongs in the support
channel described in `docs/support.md`.

## Security boundary

The Plugin is Skills-only and executes a deterministic local runtime. It has no
service, MCP endpoint, app, hook, or install-time action. External Roasteries
are untrusted read-only inputs: retrieval requires consent, uses a full commit
pin, validates the fixed contract before Bean exposure, ignores embedded
instructions as authority, and never copies external content into an owned
Roastery.

Model-facing inputs cannot assert a repository commit or provide a trusted Bean
body. A host-owned acquisition adapter retrieves public metadata and exact
commit bytes; the runtime independently checks repository identity, commit,
allowlisted paths, UTF-8, declaration/license shape, index coverage, and every
Bean digest before installing Registry state or model context. Surfaces without
that sealed in-process boundary return an explicit failure.

Only validated Bean content can enter Coffee context. Origins, workflows,
issues, pull requests, and unrelated repository files are excluded. Repository
writes require an exact Preview approval and are proposed through a protected
branch and pull request.

Supported security updates follow the repository's single CalVer release
identity. No private support window or unpublished compatibility promise is
made.
