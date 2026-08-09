import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const readJson = (path) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
const failures = [];
const fail = (message) => failures.push(message);

for (const path of [
  "submission/listing.json",
  "submission/compliance-mapping.md",
  "submission/starter-prompts.json",
  "submission/test-cases.json",
  "submission/availability.json",
  "submission/surface-support.json",
  "submission/release-candidate.json",
  "submission/policy-attestations.json",
  "submission/release-notes.md",
  "submission/owner-handoff.md",
  "docs/privacy.md",
  "docs/terms.md",
  "docs/support.md",
]) {
  if (!existsSync(resolve(root, path)))
    fail(`missing submission artifact ${path}`);
}
if (failures.length === 0) {
  const listing = readJson("submission/listing.json");
  const cases = readJson("submission/test-cases.json");
  const prompts = readJson("submission/starter-prompts.json");
  const availability = readJson("submission/availability.json");
  const support = readJson("submission/surface-support.json");
  for (const field of [
    "name",
    "shortDescription",
    "longDescription",
    "category",
    "websiteUrl",
    "privacyUrl",
    "termsUrl",
    "supportUrl",
  ]) {
    if (!listing[field]) fail(`listing missing ${field}`);
  }
  if (JSON.stringify(listing).includes("mcp"))
    fail("listing contains an MCP field or claim");
  if (!Array.isArray(prompts.prompts) || prompts.prompts.length < 3)
    fail("starter prompts are incomplete");
  if (cases.positive?.length !== 5 || cases.negative?.length !== 3)
    fail("submission requires exactly five positive and three negative cases");
  for (const item of [...(cases.positive ?? []), ...(cases.negative ?? [])]) {
    if (!item.id || !item.prompt || !item.expectedBehavior)
      fail("every portal case requires id, prompt, and expectedBehavior");
  }
  const expectedSurfaces = ["codex-local", "codex-desktop", "chatgpt-work"];
  if (
    JSON.stringify(support.surfaces?.map(({ surface }) => surface)) !==
    JSON.stringify(expectedSurfaces)
  )
    fail("surface support inventory changed");
  for (const surface of support.surfaces ?? []) {
    const fields = [
      "officialSource",
      "reviewDate",
      "packageDigest",
      "claimedCapability",
      "integrationEvidence",
      "status",
    ];
    if (surface.surface === "codex-local") fields.push("packageCommitSource");
    else fields.push("packageCommit");
    for (const field of fields) {
      if (!(field in surface)) fail(`${surface.surface} missing ${field}`);
    }
    if (
      surface.status === "supported" &&
      ((surface.packageCommit ?? "").includes("PENDING") ||
        surface.packageDigest.includes("PENDING") ||
        surface.integrationEvidence.length === 0)
    ) {
      fail(
        `${surface.surface} cannot be supported without package-matched evidence`,
      );
    }
  }
  const work = support.surfaces?.find(
    ({ surface }) => surface === "chatgpt-work",
  );
  if (work?.status !== "unsupported_surface")
    fail(
      "ChatGPT Work must remain unsupported without the complete one-chat evidence contract",
    );
  if (availability.surfaces?.includes("chatgpt-work"))
    fail("availability must exclude unsupported ChatGPT Work");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "Submission dossier structure and explicit surface states are valid.",
  );
}
