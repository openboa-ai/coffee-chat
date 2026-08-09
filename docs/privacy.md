# Coffee Chat privacy

Coffee Chat is a Skills-only package with no service operated by this
repository. Installation does not initialize a Roastery, contact a network, or
create product state.

When a user explicitly selects an external public Roastery, the Skill must show
the public GitHub repository and bounded `roastery/**` read surface and obtain
consent before retrieval. The resulting relationship is read-only, globally
registered only on persistent local surfaces, and pinned to one immutable
commit. Only the declaration, index, and referenced validated Beans may be used;
license text, Origins, workflows, issues, pull requests, and unrelated files are
excluded from model context.

The Plugin does not copy external Beans into an owned Roastery and does not
persist generated Coffee or transcripts. Unsync removes only the exact Coffee
Chat relationship record. It does not delete the public repository, a clone,
host conversation/archive history, prior outputs, or an irrevocable prior
license grant.

The host may process or retain prompts, responses, files, or conversation
history under its own terms and controls. Coffee Chat does not claim ownership
of host/session-end, archive, restoration, or retention lifecycle.
