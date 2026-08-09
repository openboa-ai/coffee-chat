import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

const root = resolve(new URL("..", import.meta.url).pathname);
const workflowRoot = resolve(root, ".github/workflows");
const failures = [];
const fail = (message) => failures.push(message);
const expectedWorkflows = [
  "codeql.yml",
  "github-coverage.yml",
  "policy.yml",
  "quality.yml",
  "release.yml",
  "sbom-attestation.yml",
];
const approvedUses = new Set([
  "actions/attest-build-provenance@977bb373ede98d70efdf65b84cb5f73e068dcc2a",
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
  "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
  "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
  "actions/upload-code-coverage@1c15be36fc3733ba839b1dd643bd9556e4426dc1",
  "github/codeql-action/analyze@c4dd10e44af883a891fe31ced449bcb4a6728b9b",
  "github/codeql-action/init@c4dd10e44af883a891fe31ced449bcb4a6728b9b",
]);
const ordinary = { contents: "read" };
const codeql = {
  actions: "read",
  contents: "read",
  "security-events": "write",
};
const attestation = {
  attestations: "write",
  contents: "read",
  "id-token": "write",
};

function sameRecord(left, right) {
  return (
    JSON.stringify(Object.entries(left ?? {}).sort()) ===
    JSON.stringify(Object.entries(right).sort())
  );
}

function collect(value, key, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, key, found);
  } else if (value && typeof value === "object") {
    for (const [itemKey, item] of Object.entries(value)) {
      if (itemKey === key) found.push(item);
      collect(item, key, found);
    }
  }
  return found;
}

const discovered = readdirSync(workflowRoot)
  .filter((name) => name.endsWith(".yml"))
  .sort();
if (JSON.stringify(discovered) !== JSON.stringify(expectedWorkflows))
  fail("Workflow set differs from the reviewed five-workflow trust base.");
const workflows = new Map();
for (const name of discovered) {
  const source = readFileSync(resolve(workflowRoot, name), "utf8");
  if (/pull_request_target/u.test(source))
    fail(`${name}: pull_request_target is forbidden`);
  if (/\bsecrets\s*\./u.test(source))
    fail(`${name}: secret context is forbidden`);
  if (
    /\b(?:npm publish|gh release|docker push|packages:\s*write)\b/u.test(source)
  )
    fail(`${name}: publish authority is forbidden`);
  const workflow = parse(source);
  workflows.set(name, workflow);
  if (!sameRecord(workflow.permissions, {}))
    fail(`${name}: workflow permissions must default to none`);
  if (collect(workflow, "continue-on-error").length > 0)
    fail(`${name}: continue-on-error is forbidden`);
  for (const use of collect(workflow, "uses")) {
    if (!/^[^@\s]+@[0-9a-f]{40}$/u.test(use) || !approvedUses.has(use))
      fail(`${name}: unapproved or non-full action pin ${use}`);
  }
  for (const [jobId, job] of Object.entries(workflow.jobs ?? {})) {
    const expected =
      name === "codeql.yml" && jobId === "analyze"
        ? codeql
        : name === "github-coverage.yml" &&
            jobId === "upload-coverage-javascript"
          ? { contents: "read", "code-quality": "write" }
          : name === "sbom-attestation.yml" &&
              jobId === "attest-release-candidate"
            ? attestation
            : ordinary;
    if (!sameRecord(job.permissions, expected))
      fail(`${name}:${jobId}: permissions differ from its job class`);
    for (const step of job.steps ?? []) {
      if (
        step.uses?.startsWith("actions/checkout@") &&
        step.with?.["persist-credentials"] !== false
      )
        fail(`${name}:${jobId}: checkout credentials must not persist`);
      if (
        step.uses?.startsWith("actions/setup-node@") &&
        String(step.with?.["node-version"]) !== "24"
      )
        fail(`${name}:${jobId}: Node 24 is required`);
    }
    if (["release.yml", "sbom-attestation.yml"].includes(name)) {
      const steps = job.steps ?? [];
      const strict = steps.findIndex(
        ({ run }) => run === "npm run validate:contract-release",
      );
      const firstBuildOrAttestation = steps.findIndex(
        ({ run, uses }) =>
          /npm run (?:verify|build|release:)/u.test(run ?? "") ||
          (uses ?? "").startsWith("actions/attest-build-provenance@"),
      );
      if (
        strict < 0 ||
        firstBuildOrAttestation < 0 ||
        strict >= firstBuildOrAttestation
      )
        fail(
          `${name}:${jobId}: strict contract validation must precede build and attestation`,
        );
      if (job.if !== "github.ref == 'refs/heads/main'")
        fail(`${name}:${jobId}: release execution must be restricted to main`);
      if (job.environment !== "release-attestation")
        fail(`${name}:${jobId}: protected release environment changed`);
    }
  }
}

for (const name of [
  "policy.yml",
  "quality.yml",
  "codeql.yml",
  "github-coverage.yml",
]) {
  const events = workflows.get(name)?.on;
  for (const event of ["pull_request", "merge_group"]) {
    if (!(event in (events ?? {})) || events[event] !== null)
      fail(`${name}: ${event} must be present without suppressing filters`);
  }
}
const aggregates = [...workflows].flatMap(([name, workflow]) =>
  Object.entries(workflow.jobs ?? {})
    .filter(([id]) => id === "aggregate")
    .map(([, job]) => ({ name, job })),
);
if (
  aggregates.length !== 1 ||
  aggregates[0].name !== "quality.yml" ||
  aggregates[0].job.if !== "always()"
)
  fail(
    "Exactly quality.yml:aggregate must be the always-created aggregate job.",
  );
else {
  const source = JSON.stringify(aggregates[0].job);
  for (const state of ["failed", "invalid", "skipped", "unavailable"])
    if (!source.includes(state))
      fail(`aggregate job does not preserve ${state}`);
}
const policy = JSON.parse(
  readFileSync(resolve(root, ".github/merge-policy.json"), "utf8"),
);
if (
  policy.repository_role !== "plugin-product" ||
  policy.merge_method !== "squash"
)
  fail("Merge policy repository role or method changed.");
for (const path of [
  "/.github/**",
  "/.agents/**",
  "/.codex-plugin/**",
  "/plugin.json",
  "/config/**",
  "/contract/**",
  "/skills/**",
  "/submission/**",
]) {
  if (!policy.protected_paths?.includes(path))
    fail(`Merge policy missing protected path ${path}`);
}
const migration = spawnSync(
  process.execPath,
  [resolve(root, "scripts/check-migration-receipt.mjs")],
  { cwd: root, encoding: "utf8" },
);
if (migration.status !== 0)
  fail(
    `Migration policy failed: ${(migration.stderr || migration.stdout).trim()}`,
  );

const repositoryPaths = [
  ...new Set([
    ...spawnSync("git", ["-C", root, "ls-files", "-z"], { encoding: "buffer" })
      .stdout.toString("utf8")
      .split("\0"),
    ...spawnSync(
      "git",
      ["-C", root, "ls-files", "--others", "--exclude-standard", "-z"],
      { encoding: "buffer" },
    )
      .stdout.toString("utf8")
      .split("\0"),
  ]),
].filter(Boolean);
for (const path of repositoryPaths) {
  if (/(^|\/)(?:node_modules|build|coverage)(\/|$)/u.test(path))
    fail(`Generated/dependency path must not be tracked: ${path}`);
  if (/(^|\/)(?:mcp|apps?|hooks?|servers?)(\/|\.|$)/iu.test(path))
    fail(`Forbidden product surface: ${path}`);
}
const productText = repositoryPaths
  .filter(
    (path) =>
      !path.startsWith("docs/migration/") &&
      !path.startsWith("contract/roastery/"),
  )
  .map((path) => {
    try {
      return readFileSync(resolve(root, path), "utf8");
    } catch {
      return "";
    }
  })
  .join("\n");
if (/\bpersona\b/iu.test(productText))
  fail("Taste vocabulary boundary violated.");
const forbiddenVersionLanguage = new RegExp(
  [`${"semantic"}\\s+${"version"}`, `${"backward"}.?${"compat"}`].join("|"),
  "iu",
);
if (forbiddenVersionLanguage.test(productText))
  fail("A second version or compatibility axis is forbidden.");

const secretPatterns = [
  new RegExp(
    ["-{5}BEGIN ", "(?:RSA |EC |OPENSSH |DSA )?", "PRIVATE KEY-{5}"].join(""),
    "u",
  ),
  new RegExp(["gh", "[pousr]_", "[A-Za-z0-9_]{36,}"].join(""), "u"),
  new RegExp(["s", "k-(?:proj-)?", "[A-Za-z0-9_-]{32,}"].join(""), "u"),
  /(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*["']?[A-Za-z0-9+/=_-]{16,}/iu,
];
for (const path of repositoryPaths) {
  let source;
  try {
    source = readFileSync(resolve(root, path), "utf8");
  } catch {
    continue;
  }
  if (secretPatterns.some((pattern) => pattern.test(source))) {
    fail(`Potential secret pattern detected in ${path}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "Coffee Chat role, workflow, permission, migration, vocabulary, and package policy passed.",
  );
}
