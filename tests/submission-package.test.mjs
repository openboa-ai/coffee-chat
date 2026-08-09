import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("owner dossier contains the exact submission case inventory", () => {
  assert.equal(
    existsSync("submission/test-cases.json"),
    true,
    "submission cases must exist",
  );
  const cases = JSON.parse(readFileSync("submission/test-cases.json", "utf8"));
  assert.equal(cases.positive.length, 5);
  assert.equal(cases.negative.length, 3);
  for (const item of [...cases.positive, ...cases.negative]) {
    assert.ok(item.id && item.prompt && item.expectedBehavior);
  }
  assert.equal(
    new Set([...cases.positive, ...cases.negative].map(({ id }) => id)).size,
    8,
  );
});

test("every named surface has an explicit evidence state", () => {
  assert.equal(
    existsSync("submission/surface-support.json"),
    true,
    "support matrix must exist",
  );
  const support = JSON.parse(
    readFileSync("submission/surface-support.json", "utf8"),
  );
  assert.deepEqual(
    support.surfaces.map((surface) => surface.surface),
    ["codex-local", "codex-desktop", "chatgpt-work"],
  );
  for (const surface of support.surfaces)
    assert.notEqual(surface.status, "supported");
  const work = support.surfaces.find(
    ({ surface }) => surface === "chatgpt-work",
  );
  assert.equal(work.status, "unsupported_surface");
  assert.equal(work.oneChatEvidence.publicUrlFlow, false);
  assert.equal(work.oneChatEvidence.preFetchConfirmation, false);
  assert.equal(work.oneChatEvidence.noArchiveRestoreRefreshClaim, true);
  assert.equal(work.oneChatEvidence.noDurableRegistryClaim, true);
});

test("listing and release dossier bind the built Skill and executable payload digests", () => {
  const listing = JSON.parse(readFileSync("submission/listing.json", "utf8"));
  const candidate = JSON.parse(
    readFileSync("submission/release-candidate.json", "utf8"),
  );
  const receipt = JSON.parse(
    readFileSync("build/package-receipt.json", "utf8"),
  );
  const support = JSON.parse(
    readFileSync("submission/surface-support.json", "utf8"),
  );
  assert.equal(listing.version, "2026.8.9");
  assert.equal(listing.skillBundleDigest, receipt.skillBundleDigest);
  assert.equal(candidate.skillBundleDigest, receipt.skillBundleDigest);
  assert.equal(candidate.pluginPayloadDigest, receipt.pluginPayloadDigest);
  assert.equal(support.surfaces[0].packageDigest, receipt.pluginPayloadDigest);
  assert.equal(
    candidate.roasteryContract.commitSource,
    "config/roastery-contract.json",
  );
  assert.equal("repositoryCommit" in candidate, false);
  assert.equal(candidate.buildRevisionSource, "build/package-receipt.json");
  const buildRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  assert.equal(receipt.buildRevision, buildRevision);
  assert.equal(receipt.revisionState, "local_worktree");
  const packagedCandidate = JSON.parse(
    execFileSync(
      "unzip",
      [
        "-p",
        "build/coffee-chat-plugin.zip",
        "coffee-chat/submission/release-candidate.json",
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(packagedCandidate.buildRevision, buildRevision);
  assert.equal(
    packagedCandidate.pluginPayloadDigest,
    receipt.pluginPayloadDigest,
  );
  assert.equal(
    support.surfaces[0].packageCommitSource,
    "build/package-receipt.json",
  );
  const localEvidence = JSON.parse(
    readFileSync("submission/evidence/codex-local-acceptance.json", "utf8"),
  );
  assert.equal(localEvidence.packageCommitSource, "build/package-receipt.json");
  assert.equal(localEvidence.pluginPayloadDigest, receipt.pluginPayloadDigest);
  assert.equal(candidate.publishAuthority, false);
});

test("public policies state the real consent, retention, Unsync, and support boundaries", () => {
  const source = ["docs/privacy.md", "docs/terms.md", "docs/support.md"]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  for (const marker of [
    "consent",
    "read-only",
    "Unsync",
    "host",
    "external",
    "CC BY 4.0",
  ]) {
    assert.match(source, new RegExp(marker, "iu"));
  }
  assert.doesNotMatch(
    source,
    /automatic(?:ally)? (?:delete|refresh)|session-end cleanup/iu,
  );
});

test("CycloneDX SBOM binds the deterministic package and sorted locked dependencies", () => {
  const sbom = JSON.parse(readFileSync("build/sbom.cdx.json", "utf8"));
  const receipt = JSON.parse(
    readFileSync("build/package-receipt.json", "utf8"),
  );
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.specVersion, "1.6");
  assert.equal(
    sbom.metadata.component.hashes[0].content,
    receipt.packageDigest.slice("sha256:".length),
  );
  assert.deepEqual(sbom.metadata.properties, [
    { name: "coffee-chat:buildRevision", value: receipt.buildRevision },
    { name: "coffee-chat:revisionState", value: receipt.revisionState },
  ]);
  assert.deepEqual(
    sbom.components.map(({ name }) => name),
    sbom.components
      .map(({ name }) => name)
      .sort((left, right) => left.localeCompare(right, "en")),
  );
  assert.ok(
    sbom.components.every(
      ({ purl, version }) => purl.startsWith("pkg:npm/") && version,
    ),
  );
});
