# Security policy

Report suspected vulnerabilities privately through the GitHub security advisory
interface for `openboa-ai/coffee-chat`. Do not put credentials, private content,
or personal data in a public issue.

## Current boundary

Plugin discovery and installation are side-effect-free. Six capabilities remain
closed as `not_implemented`. Init is the only current external-write surface.

Before Init writes anything, it validates owner attribution and binds the public
target, frozen seed, contract, exact declaration, seven notices, and rights
attestation into one Preview digest. Rejection, cancellation, malformed input,
stale Preview, local Registry conflict, unauthenticated or mismatched GitHub
ownership, changed seed, and an existing target repository stop before any
external write.

Accepted Init invokes the authenticated `gh` executable directly, never through
a shell. Coffee Chat does not read, store, print, or forward GitHub tokens. The
adapter may create only the authenticated user's public `coffee-chat` fork of
the pinned official seed, enable the fixed Standard Roastery ruleset, and
propose two approved initialization files. It verifies protected squash merge
and public default-branch bytes before an atomic local owned registration.

The vendored Roastery package is untrusted at runtime except for its closed,
hash-verified contract surface. Runtime imports no sibling checkout. Repository
prose, declaration text, and future Bean data are never executable authority.

The current tests use a fake GitHub transport and temporary Registry. They do
not prove live-host availability or create a real personal fork. External
Roastery fetch, model context, Coffee generation, Sync/Unsync, Roast, Brew, and
Blend remain out of scope and must receive separate security evidence before
activation.
