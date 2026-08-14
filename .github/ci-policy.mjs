import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadPolicyParser } from "./policy-bootstrap.mjs";

const controlRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(process.env.CI_POLICY_ROOT ?? controlRoot);
const { parseDocument } = loadPolicyParser(controlRoot);
assert.equal(
  existsSync(resolve(root, ".npmrc")),
  false,
  "root .npmrc must be absent",
);
assert.equal(
  existsSync(resolve(root, ".github/policy-parser/.npmrc")),
  false,
  "isolated policy parser .npmrc must be absent before install",
);
assert.equal(
  existsSync(resolve(root, "npm-shrinkwrap.json")),
  false,
  "root npm-shrinkwrap.json must be absent",
);
assert.equal(
  existsSync(resolve(root, ".github/policy-parser/npm-shrinkwrap.json")),
  false,
  "isolated policy parser npm-shrinkwrap.json must be absent before loading",
);
const pathAt = (path) => `${root}/${path}`;
const workflowRoot = pathAt(".github/workflows");
const YAML_MAX_BYTES = 256 * 1024;
const YAML_MAX_ALIASES = 100;
const YAML_MAX_DEPTH = 32;
const YAML_MAX_NODES = 10_000;
const YAML_MAX_STRING_BYTES = 256 * 1024;

function read(path) {
  return readFileSync(pathAt(path), "utf8");
}

function assertYamlResourceBudget(value, label) {
  const pending = [{ value, depth: 0 }];
  const seen = new WeakSet();
  let nodes = 0;
  let stringBytes = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    nodes += 1;
    assert.ok(nodes <= YAML_MAX_NODES, `${label}: document node limit`);
    assert.ok(
      current.depth <= YAML_MAX_DEPTH,
      `${label}: document depth limit`,
    );
    if (typeof current.value === "string") {
      stringBytes += Buffer.byteLength(current.value, "utf8");
      assert.ok(
        stringBytes <= YAML_MAX_STRING_BYTES,
        `${label}: document string limit`,
      );
      continue;
    }
    if (!current.value || typeof current.value !== "object") continue;
    if (seen.has(current.value)) continue;
    seen.add(current.value);
    const children = Array.isArray(current.value)
      ? current.value
      : Object.entries(current.value).flat();
    for (const child of children) {
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
}

function parseBoundedYaml(path, label) {
  const source = read(path);
  assert.ok(
    Buffer.byteLength(source, "utf8") <= YAML_MAX_BYTES,
    `${label}: document byte limit`,
  );
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(document.errors, [], `${label}: unique valid YAML`);
  let value;
  try {
    value = document.toJS({ maxAliasCount: YAML_MAX_ALIASES });
  } catch {
    assert.fail(`${label}: alias resource limit`);
  }
  assertYamlResourceBudget(value, label);
  return value;
}

function exactKeys(value, keys, label) {
  assert.equal(
    value !== null && typeof value === "object" && !Array.isArray(value),
    true,
    `${label}: object required`,
  );
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label);
}

assert.deepEqual(
  readdirSync(workflowRoot)
    .filter((name) => /\.ya?ml$/u.test(name))
    .sort(),
  ["trusted.yml"],
  "target repository must expose only the trusted wrapper",
);
const trustedWorkflowSource = read(".github/workflows/trusted.yml");
const trustedControlSha = trustedWorkflowSource.match(
  /uses: openboa-ai\/\.github\/\.github\/workflows\/coffee-trusted-gate\.yml@([0-9a-f]{40})/u,
)?.[1];
assert.ok(trustedControlSha, "trusted wrapper must use one full control SHA");
assert.equal(
  trustedControlSha,
  "f2e0db9ee5fc67c63fe789d0e80bb3061436bc6c",
  "trusted wrapper must use the approved central control SHA",
);
assert.equal(
  trustedWorkflowSource,
  `name: OpenBoa Coffee trusted gate

on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review]

permissions: {}

jobs:
  trusted:
    name: OpenBoa Coffee trusted required
    permissions:
      actions: read
      contents: read
      security-events: write
    uses: openboa-ai/.github/.github/workflows/coffee-trusted-gate.yml@${trustedControlSha}
    with:
      control_sha: ${trustedControlSha}
`,
  "trusted wrapper must remain exact",
);

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
assert.equal(
  packageJson.scripts.policy,
  "node --test tests/workflow-policy.test.mjs && node .github/ci-policy.mjs",
);
assert.deepEqual(packageJson.scripts, {
  "format:check": "prettier --check .",
  format: "prettier --write .",
  typecheck: "tsc --noEmit",
  test: "node --test tests/*.test.mjs",
  "readme:assets:verify": "node scripts/verify-readme-assets.mjs",
  "readme:assets:reproduce": "node scripts/reproduce-readme-assets.mjs",
  build: "node scripts/build-package.mjs",
  "package:smoke": "node scripts/package-smoke.mjs",
  "hooks:install": "git config core.hooksPath .githooks",
  policy:
    "node --test tests/workflow-policy.test.mjs && node .github/ci-policy.mjs",
  "security:scan": "gitleaks git --redact --no-banner .",
  verify:
    "npm run format:check && npm run typecheck && npm test && npm run readme:assets:verify && npm run build && npm run package:smoke && npm run policy",
});
assert.deepEqual(Object.keys(packageJson.devDependencies).sort(), [
  "@types/node",
  "prettier",
  "typescript",
]);
assert.equal(packageLock.lockfileVersion, 3);
assert.equal(packageLock.requires, true);
assert.equal(packageLock.name, packageJson.name);
assert.deepEqual(
  packageLock.packages[""].devDependencies,
  packageJson.devDependencies,
);
assert.deepEqual(packageLock.packages[""].engines, packageJson.engines);
for (const [lockPath, entry] of Object.entries(packageLock.packages)) {
  if (lockPath === "") continue;
  const marker = "node_modules/";
  const markerIndex = lockPath.lastIndexOf(marker);
  assert.notEqual(markerIndex, -1, `${lockPath}: package identity`);
  const name = lockPath.slice(markerIndex + marker.length);
  const version = entry.version;
  assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
  const tarballName = name.slice(name.lastIndexOf("/") + 1);
  assert.equal(
    entry.resolved,
    `https://registry.npmjs.org/${name}/-/${tarballName}-${version}.tgz`,
    `${name}: registry identity`,
  );
  assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  assert.notEqual(entry.link, true, `${name}: linked dependency`);
  assert.notEqual(entry.hasInstallScript, true, `${name}: install script`);
}

const dependabot = parseBoundedYaml(".github/dependabot.yml", "dependabot.yml");
assert.equal(dependabot.version, 2);
assert.equal(Array.isArray(dependabot.updates), true);
assert.equal(dependabot.updates.length, 2);
const updateByEcosystem = new Map(
  dependabot.updates.map((update) => [update["package-ecosystem"], update]),
);
assert.deepEqual([...updateByEcosystem.keys()].sort(), [
  "github-actions",
  "npm",
]);
for (const [ecosystem, update] of updateByEcosystem) {
  assert.equal(update.directory, "/", `${ecosystem}: root updates`);
  assert.deepEqual(update.schedule, { interval: "weekly" });
  assert.equal(update["open-pull-requests-limit"], 5);
  assert.deepEqual(update["commit-message"], { prefix: "deps" });
  assert.deepEqual(update.allow, [
    {
      "dependency-name": "*",
      "update-types": [
        "version-update:semver-minor",
        "version-update:semver-patch",
      ],
    },
  ]);
  assert.deepEqual(update.groups.security, {
    "applies-to": "security-updates",
    patterns: ["*"],
  });
}
assert.deepEqual(updateByEcosystem.get("npm").groups, {
  security: { "applies-to": "security-updates", patterns: ["*"] },
  "production-minor-patch": {
    "applies-to": "version-updates",
    "dependency-type": "production",
    "update-types": ["minor", "patch"],
    patterns: ["*"],
  },
  "development-minor-patch": {
    "applies-to": "version-updates",
    "dependency-type": "development",
    "update-types": ["minor", "patch"],
    patterns: ["*"],
  },
});
assert.deepEqual(updateByEcosystem.get("github-actions").groups, {
  security: { "applies-to": "security-updates", patterns: ["*"] },
  "compatible-actions": {
    "applies-to": "version-updates",
    "update-types": ["minor", "patch"],
    patterns: ["*"],
  },
});

const mergePolicy = JSON.parse(read(".github/merge-policy.json"));
exactKeys(
  mergePolicy,
  [
    "merge_method",
    "required_approvals",
    "required_code_owner_reviews",
    "required_last_push_approvals",
    "merge_queue",
    "required_events",
    "eligible_author_associations",
    "eligible_bot_logins",
    "custom_merge_controller",
    "required_checks",
    "protected_paths",
    "codeql_enforcement",
    "sensitive_review",
  ],
  "merge policy",
);
assert.equal(mergePolicy.merge_method, "squash");
assert.equal(mergePolicy.required_approvals, 0);
assert.equal(mergePolicy.required_code_owner_reviews, 0);
assert.equal(mergePolicy.required_last_push_approvals, 0);
assert.equal(mergePolicy.merge_queue, false);
assert.deepEqual(mergePolicy.required_events, ["pull_request"]);
assert.deepEqual(mergePolicy.eligible_author_associations, ["OWNER", "MEMBER"]);
assert.deepEqual(mergePolicy.eligible_bot_logins, ["dependabot[bot]"]);
assert.equal("eligible_author_logins" in mergePolicy, false);
assert.equal(mergePolicy.custom_merge_controller, false);
assert.deepEqual(mergePolicy.required_checks, [
  {
    context:
      "OpenBoa Coffee trusted required / OpenBoa Coffee trusted required",
    integration_id: 15368,
  },
]);
assert.deepEqual(mergePolicy.protected_paths, [
  "/.github/**",
  "/.githooks/**",
  "/.gitleaksignore",
  "/.gitleaks.toml",
  "/.agents/**",
  "/.codex-plugin/**",
  "/AGENTS.md",
  "/CODEOWNERS",
  "/SECURITY.md",
  "/.npmrc",
  "/contract/**",
  "/package.json",
  "/package-lock.json",
  "/npm-shrinkwrap.json",
  "/runtime/**",
  "/scripts/**",
  "/skills/**",
]);
assert.equal(mergePolicy.codeql_enforcement, "trusted_central_aggregate");
assert.deepEqual(mergePolicy.sensitive_review, {
  enforcement: "github_environment",
  environment: "coffee-security",
  required_approvals: 1,
  prevent_self_review: false,
});

const agents = read("AGENTS.md");
assert.match(agents, /GitHub-native\s+squash auto-merge/u);
assert.match(agents, /repository ruleset/u);
assert.match(agents, /coffee-security/u);
assert.match(agents, /Never add custom\s+write-token merge automation/u);
const pullRequestTemplate = read(".github/PULL_REQUEST_TEMPLATE.md");
assert.match(pullRequestTemplate, /Sensitive-path declaration/u);
assert.match(pullRequestTemplate, /coffee-security/u);

for (const path of [
  "src",
  "roastery",
  "evaluation",
  "benchmark",
  "hooks",
  "build",
  "submission",
  "mcp.json",
  ".mcp.json",
  ".app.json",
  "docs/migration",
]) {
  assert.equal(existsSync(pathAt(path)), false, `forbidden path: ${path}`);
}
process.stdout.write(`${JSON.stringify({ status: "policy_passed" })}\n`);
