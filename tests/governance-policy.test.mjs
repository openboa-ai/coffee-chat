import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { parse } from "yaml";

const required = [
  "AGENTS.md",
  "CODEOWNERS",
  "LICENSE",
  ".github/coverage-requirements.txt",
  ".github/merge-policy.json",
  ".github/workflows/policy.yml",
  ".github/workflows/quality.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/github-coverage.yml",
  ".github/workflows/release.yml",
  ".github/workflows/sbom-attestation.yml",
];

test("governance trust base exposes every protected policy artifact", () => {
  for (const path of required) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }
});

test("workflow authority is least privilege and fully pinned", () => {
  for (const path of required.filter((value) => value.endsWith(".yml"))) {
    assert.equal(
      existsSync(path),
      true,
      `${path} must exist before inspection`,
    );
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /pull_request_target/u);
    for (const match of source.matchAll(/uses:\s*([^\s#]+)/gu)) {
      if (match[1].startsWith("./")) continue;
      assert.match(match[1], /@[0-9a-f]{40}$/u, `${path}: ${match[1]}`);
    }
  }
});

test("only CodeQL and protected-main attestation receive reviewed write scopes", () => {
  const codeql = readFileSync(".github/workflows/codeql.yml", "utf8");
  const attestation = readFileSync(
    ".github/workflows/sbom-attestation.yml",
    "utf8",
  );
  const ordinary = ["policy.yml", "quality.yml", "release.yml"]
    .map((name) => readFileSync(`.github/workflows/${name}`, "utf8"))
    .join("\n");
  assert.match(codeql, /security-events: write/u);
  assert.doesNotMatch(codeql, /id-token: write|attestations: write/u);
  assert.match(attestation, /id-token: write/u);
  assert.match(attestation, /attestations: write/u);
  assert.doesNotMatch(attestation, /security-events: write|packages: write/u);
  assert.doesNotMatch(
    ordinary,
    /security-events: write|id-token: write|attestations: write|packages: write/u,
  );
  assert.doesNotMatch(
    [codeql, attestation, ordinary].join("\n"),
    /npm publish|docker push|gh release create/u,
  );
});

test("release jobs fail closed on the contract pin before build or attestation", () => {
  for (const path of [
    ".github/workflows/release.yml",
    ".github/workflows/sbom-attestation.yml",
  ]) {
    const workflow = parse(readFileSync(path, "utf8"));
    for (const job of Object.values(workflow.jobs)) {
      const steps = job.steps ?? [];
      const strictIndex = steps.findIndex(
        ({ run }) => run === "npm run validate:contract-release",
      );
      const firstBuildOrAttestation = steps.findIndex(
        ({ run, uses }) =>
          /npm run (?:verify|build|release:)/u.test(run ?? "") ||
          (uses ?? "").startsWith("actions/attest-build-provenance@"),
      );
      assert.ok(strictIndex >= 0, `${path} must run strict release validation`);
      assert.ok(
        firstBuildOrAttestation >= 0 && strictIndex < firstBuildOrAttestation,
        `${path} must validate the contract before build or attestation`,
      );
    }
  }
});

test("coverage CI produces same-repository GitHub Code Quality evidence", () => {
  const source = readFileSync(".github/workflows/github-coverage.yml", "utf8");
  assert.match(source, /^name: Coffee Chat code coverage$/mu);
  assert.match(source, /pull_request:/u);
  assert.match(source, /merge_group:/u);
  assert.match(source, /--experimental-test-coverage/u);
  assert.match(source, /RUNNER_TEMP/u);
  assert.match(source, /runner\.temp/u);
  assert.match(source, /cobertura\.xml/u);
  assert.match(
    source,
    /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/u,
  );
  assert.match(source, /code-quality: write/u);
  assert.match(source, /actions\/upload-code-coverage@[0-9a-f]{40}/u);
  assert.match(source, /label: product-javascript/u);
  assert.match(
    readFileSync(".github/coverage-requirements.txt", "utf8"),
    /^lcov_cobertura==2\.1\.1 --hash=sha256:[0-9a-f]{64}\n$/u,
  );
});
