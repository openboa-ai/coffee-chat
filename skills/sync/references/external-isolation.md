# External isolation

External Roasteries are globally registered, consent-gated, immutable commit
snapshots. They remain read-only and are never copied into an owned Roastery.
Origins, workflows, issues, pull requests, and unrelated repository files are
not Coffee sources and must not be fetched for a Coffee response.

The caller may select only the repository. A trusted in-process adapter obtains
public metadata and exact commit bytes; the runtime verifies declaration,
license, index, and Bean digests before Registry or model-context installation.
Serialized caller claims are not acquisition evidence.
