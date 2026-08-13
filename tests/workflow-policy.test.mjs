import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, test } from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checker = join(repositoryRoot, ".github", "ci-policy.mjs");
const fixtures = [];

afterEach(() => {
  while (fixtures.length > 0) {
    rmSync(fixtures.pop(), { force: true, recursive: true });
  }
});

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "coffee-chat-policy-"));
  fixtures.push(root);
  for (const path of [
    ".github",
    "AGENTS.md",
    "CODEOWNERS",
    "SECURITY.md",
    "package.json",
  ]) {
    cpSync(join(repositoryRoot, path), join(root, path), { recursive: true });
  }
  return root;
}

function source(root, path) {
  return readFileSync(join(root, path), "utf8");
}

function replaceOnce(root, path, before, after) {
  const input = source(root, path);
  assert.equal(input.includes(before), true, `${path}: missing fixture source`);
  writeFileSync(join(root, path), input.replace(before, after), "utf8");
}

function runPolicy(root) {
  return spawnSync(process.execPath, [checker], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, CI_POLICY_ROOT: root },
  });
}

function assertRejected(name, mutate) {
  test(`policy rejects ${name}`, () => {
    const root = fixtureRoot();
    mutate(root);
    const result = runPolicy(root);
    assert.notEqual(
      result.status,
      0,
      `${name} unexpectedly passed\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  });
}

test("repository policy accepts the canonical workflow set", () => {
  const result = runPolicy(fixtureRoot());
  assert.equal(
    result.status,
    0,
    `policy failed\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
  );
});

test("canonical author gates admit only maintainers and Dependabot", () => {
  const quality = source(fixtureRoot(), ".github/workflows/quality.yml");
  const boundary = source(
    fixtureRoot(),
    ".github/workflows/secret-boundary.yml",
  );
  const policy = JSON.parse(source(fixtureRoot(), ".github/merge-policy.json"));
  assert.match(quality, /dependabot\[bot\]/u);
  assert.match(boundary, /dependabot\[bot\]/u);
  assert.deepEqual(policy.eligible_bot_logins, ["dependabot[bot]"]);
  assert.doesNotMatch(quality, /COLLABORATOR|CONTRIBUTOR/u);
});

assertRejected("duplicate YAML mapping keys", (root) => {
  const path = ".github/workflows/quality.yml";
  writeFileSync(
    join(root, path),
    `${source(root, path)}\npermissions:\n  contents: write\n`,
    "utf8",
  );
});

assertRejected("escaped permission keys", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "permissions: {}",
    '"permissio\\u006es": write-all',
  );
});

assertRejected("aliases that hide write permissions", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "permissions: {}",
    "x-permissions: &write-permissions\n  contents: write\npermissions: *write-permissions",
  );
});

assertRejected("escaped unpinned action keys", (root) => {
  const action =
    "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    action,
    '"us\\u0065s": actions/checkout@main',
  );
});

assertRejected("flow-style unpinned actions", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "    steps:\n",
    "    steps:\n      - { uses: actions/cache@main }\n",
  );
});

assertRejected("future workflows with write permissions", (root) => {
  writeFileSync(
    join(root, ".github/workflows/future.yml"),
    `name: Future\n\non:\n  pull_request:\n  merge_group:\n\npermissions:\n  contents: write\n\njobs:\n  future:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 5\n    steps:\n      - run: 'true'\n`,
    "utf8",
  );
});

assertRejected("job-level write permission overrides", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "permissions:\n      contents: read",
    "permissions:\n      contents: read\n      actions: write",
  );
});

assertRejected("pull_request_target on candidate workflows", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "  pull_request:\n",
    "  pull_request_target:\n",
  );
});

assertRejected("a removed author eligibility gate", (root) => {
  const path = ".github/workflows/quality.yml";
  const input = source(root, path);
  const start = input.indexOf(
    "      - name: Verify trusted pull request author\n",
  );
  const end = input.indexOf(
    "      - name: Check out repository without persisted credentials\n",
    start,
  );
  assert.ok(start >= 0 && end > start);
  writeFileSync(join(root, path), input.slice(0, start) + input.slice(end));
});

assertRejected("an author gate moved after checkout", (root) => {
  const path = ".github/workflows/quality.yml";
  const input = source(root, path);
  const gateStart = input.indexOf(
    "      - name: Verify trusted pull request author\n",
  );
  const checkoutStart = input.indexOf(
    "      - name: Check out repository without persisted credentials\n",
    gateStart,
  );
  const setupStart = input.indexOf(
    "      - name: Install immutable Gitleaks\n",
    checkoutStart,
  );
  assert.ok(
    gateStart >= 0 && checkoutStart > gateStart && setupStart > checkoutStart,
  );
  const gate = input.slice(gateStart, checkoutStart);
  const checkout = input.slice(checkoutStart, setupStart);
  writeFileSync(
    join(root, path),
    input.slice(0, gateStart) + checkout + gate + input.slice(setupStart),
  );
});

assertRejected("a weakened author eligibility gate", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "OWNER|MEMBER)",
    "OWNER|MEMBER|COLLABORATOR)",
  );
});

assertRejected("a removed Dependabot identity gate", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    'if test "$PR_AUTHOR" = "dependabot[bot]"; then',
    "if true; then",
  );
});

assertRejected("a broadened eligible bot policy", (root) => {
  replaceOnce(
    root,
    ".github/merge-policy.json",
    '"eligible_bot_logins": ["dependabot[bot]"]',
    '"eligible_bot_logins": ["dependabot[bot]", "renovate[bot]"]',
  );
});

assertRejected("persisted checkout credentials", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "persist-credentials: false",
    "persist-credentials: true",
  );
});

assertRejected("an unpinned action", (root) => {
  replaceOnce(
    root,
    ".github/workflows/codeql.yml",
    "github/codeql-action/init@5595ccaf912efad79be6eef63a5619ff05969be3",
    "github/codeql-action/init@v3",
  );
});

assertRejected("a missing job timeout", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "    timeout-minutes: 30\n",
    "",
  );
});

assertRejected("policy execution removed from its owning job", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "      - name: Check repository policy\n        run: npm run policy\n",
    "",
  );
});

assertRejected("policy execution moved to the aggregate job", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "      - name: Check repository policy\n        run: npm run policy\n",
    "",
  );
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "      - name: Interpret required lane state\n",
    "      - name: Check repository policy\n        run: npm run policy\n      - name: Interpret required lane state\n",
  );
});

assertRejected("a weakened package policy command", (root) => {
  const path = "package.json";
  const packageJson = JSON.parse(source(root, path));
  packageJson.scripts.policy = "node .github/ci-policy.mjs";
  writeFileSync(join(root, path), `${JSON.stringify(packageJson, null, 2)}\n`);
});

assertRejected("an install that enables dependency scripts", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "npm ci --ignore-scripts",
    "npm ci",
  );
});

assertRejected("a missing moderate dependency audit", (root) => {
  replaceOnce(
    root,
    ".github/workflows/quality.yml",
    "      - name: Audit dependencies\n        run: npm audit --audit-level=moderate\n",
    "",
  );
});

assertRejected("weakened dependency review thresholds", (root) => {
  replaceOnce(
    root,
    ".github/workflows/dependency-review.yml",
    "          fail-on-severity: moderate\n",
    "          fail-on-severity: critical\n",
  );
});

assertRejected("weakened dependency review scopes", (root) => {
  replaceOnce(
    root,
    ".github/workflows/dependency-review.yml",
    "          fail-on-scopes: runtime,development,unknown\n",
    "          fail-on-scopes: runtime\n",
  );
});

assertRejected("inexact merge-group dependency revisions", (root) => {
  replaceOnce(
    root,
    ".github/workflows/dependency-review.yml",
    "${{ github.event.merge_group.base_sha }}",
    "${{ github.sha }}",
  );
});

assertRejected("raw-blob secret scan removal", (root) => {
  replaceOnce(
    root,
    ".github/workflows/secret-boundary.yml",
    'git -C candidate cat-file blob "$object_id" > "$blob_dir/$object_id"',
    "true",
  );
});

assertRejected("routine semver-major dependency updates", (root) => {
  replaceOnce(
    root,
    ".github/dependabot.yml",
    "          - version-update:semver-patch\n",
    "          - version-update:semver-patch\n          - version-update:semver-major\n",
  );
});

assertRejected("a removed security-update group", (root) => {
  const path = ".github/dependabot.yml";
  const input = source(root, path);
  const block =
    '      security:\n        applies-to: security-updates\n        patterns:\n          - "*"\n';
  assert.equal(input.includes(block), true);
  writeFileSync(join(root, path), input.replace(block, ""), "utf8");
});

assertRejected(
  "combined production and development version updates",
  (root) => {
    replaceOnce(
      root,
      ".github/dependabot.yml",
      "        dependency-type: production\n",
      "",
    );
  },
);
