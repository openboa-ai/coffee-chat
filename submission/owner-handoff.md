# Coffee Chat owner handoff

## Candidate identity

- Repository: `https://github.com/openboa-ai/coffee-chat`
- Release identifier: `2026.8.9` (single calendar identity)
- Executable payload revision: derive at build time from
  `build/package-receipt.json`; never replace it with a tracked hash
- Plugin archive/digests: use `npm run release:candidate` only after the
  contract pin is final; ordinary local acceptance may use
  `npm run release:local`
- Contract bundle:
  `sha256:6cc68d5ecff920235c093922a563e9297fc0e7f073f831070c822c0df56ca151`
- Contract commit: replace the single token in `config/roastery-contract.json`
  only after Task 5 reaches protected `main`, then regenerate manifests/evidence
  and rerun release validation
- SBOM: `build/sbom.cdx.json`
- Attestation: protected-main `sbom-attestation.yml`; no publish authority

## Portal values

Use `listing.json`, `starter-prompts.json`, the exact five positive and three
negative cases in `test-cases.json`, `availability.json`, `release-notes.md`,
and `policy-attestations.json`. Upload the final Skills-only archive only after
the release validator accepts the real contract commit and production asset
provenance is approved. Do not add UI screenshots.

## Unsupported surfaces

Use `surface-support.json` as the claim boundary. Local acceptance is not
deployed support. Codex Desktop and ChatGPT Work are excluded until a run binds
the exact package commit/digest and all required evidence. ChatGPT Work
additionally requires the complete one-chat consent, transient-state,
first-response disclosure, commit-pinned citation, and no archive/Registry
parity evidence contract.

## Owner-only actions

1. Verify the Openboa AI publisher identity and Apps Management write access.
2. Create a Skills-only draft in the OpenAI submission portal.
3. Upload the final archive and supply the dossier values.
4. Complete policy attestations and wait for the Skill safety/security scan.
5. Address portal or reviewer findings, submit for review, and publish only
   after approval.

These identity, scan, review, and publication states cannot be inferred from
repository checks.
