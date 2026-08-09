# Security policy

Report suspected vulnerabilities privately through the GitHub security advisory
interface for openboa-ai/coffee-chat. Do not put credentials, private content,
or personal data in a public issue.

## Current boundary

This migration shell has no network client, external-data reader, Git or GitHub
adapter, model call, persistent state, or publication operation. Every
capability returns a deterministic "not_implemented" result.

External Roasteries will remain untrusted, explicitly selected, consent-gated,
commit-pinned, and read-only when the later implementation Goal adds product
behavior. That future work requires its own security review and acceptance
evidence; this shell does not claim those mechanics exist.
