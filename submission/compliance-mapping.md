# Current-source submission compliance mapping

Review basis: workspace receipt
`docs/engineering/receipts/2026-08-09-current-plugin-submission-compliance.md`,
reviewed 2026-08-09 against the current Agent Plugins and OpenAI Plugins
documentation.

| Requirement                    | Repository evidence                                                                                                                       | State                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Skills-only OpenAI manifest    | `.codex-plugin/plugin.json`, generated-source equality validator                                                                          | implemented; independent local parser accepted `2026.8.9`                     |
| Separate portable projection   | root `plugin.json`, Agent Plugins schema check                                                                                            | implemented; validated independently                                          |
| Single-root contained ZIP      | deterministic stored ZIP plus `package-receipt.json`; 100 MB archive, 100 MiB entry, 5,000-entry, 512 MiB extracted, and 20-segment gates | implemented                                                                   |
| Seven valid Skills             | seven immediate `skills/` children, each with front matter, instructions, reference, and launcher                                         | implemented; all seven independent Skill validators pass                      |
| No excluded runtime surface    | manifests, package inventory, role policy, and archive inspection                                                                         | implemented                                                                   |
| Listing and starter prompts    | `listing.json`, three prompts, policy URLs, exact bundle digest                                                                           | implemented; publisher identity remains owner-verified external state         |
| Portal cases                   | exactly five positive and three negative entries with expected behavior                                                                   | implemented                                                                   |
| Surface evidence               | local acceptance row plus explicit Codex Desktop and ChatGPT Work unsupported rows                                                        | no deployed surface is claimed supported                                      |
| Public policy                  | privacy, terms, support, security, retention, and Unsync boundaries                                                                       | implemented as repository source pages; public URL availability follows merge |
| Production brand assets        | no screenshots for the no-UI package                                                                                                      | blocked pending approved logo/icon provenance                                 |
| Contract identity              | exact vendored bytes and fixed bundle digest                                                                                              | blocked only on the protected-main Task 5 commit token                        |
| SBOM and attestation           | deterministic CycloneDX generator and protected-main least-privilege workflow                                                             | local SBOM implemented; hosted attestation pending protected-main workflow    |
| Portal scan/review/publication | owner handoff                                                                                                                             | pending owner-only external actions                                           |

Local marketplace discovery and deterministic installed-package execution remain
acceptance evidence only. They do not establish Codex Desktop, ChatGPT Work,
public-directory, publisher-verification, scan, review, or publication state.

Independent review remediation binds Init to verified official-fork metadata,
routes external Sync through a sealed host acquisition boundary with exact
committed-byte/index-digest checks, and makes both release workflows run strict
contract validation before verification, build, SBOM, or attestation. Candidate,
package, and SBOM evidence derive the exact checked-out revision during build;
no tracked artifact claims its own future commit.
