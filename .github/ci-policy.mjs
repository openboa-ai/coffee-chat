import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.env.CI_POLICY_ROOT ?? ".");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const TRUSTED_CONTROL_SHA = "f33da6bbcdfebd0693ff7673d750f369629e000e";

assert.equal(existsSync(resolve(root, ".npmrc")), false);
assert.equal(existsSync(resolve(root, "npm-shrinkwrap.json")), false);
assert.deepEqual(
  readdirSync(resolve(root, ".github/workflows"))
    .filter((name) => /\.ya?ml$/u.test(name))
    .sort(),
  ["trusted.yml"],
);
assert.equal(
  readFileSync(resolve(root, ".github/workflows/trusted.yml"), "utf8"),
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
    uses: openboa-ai/.github/.github/workflows/coffee-trusted-gate.yml@${TRUSTED_CONTROL_SHA}
    with:
      control_sha: ${TRUSTED_CONTROL_SHA}
`,
  "trusted wrapper must remain exact",
);

assert.deepEqual(readdirSync(root).sort(), [
  ".claude-plugin",
  ".codex-plugin",
  ".editorconfig",
  ".git",
  ".gitattributes",
  ".githooks",
  ".github",
  ".gitignore",
  "AGENTS.md",
  "CODEOWNERS",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "package-lock.json",
  "package.json",
  "plugin.json",
  "skills",
]);

assert.deepEqual(readJson("package.json"), {
  name: "@openboa-ai/coffee-chat",
  private: true,
  type: "module",
  scripts: { verify: "node .github/ci-policy.mjs" },
});
assert.deepEqual(readJson("package-lock.json"), {
  name: "@openboa-ai/coffee-chat",
  version: "0.0.0",
  lockfileVersion: 3,
  requires: true,
  packages: {
    "": {
      name: "@openboa-ai/coffee-chat",
      version: "0.0.0",
    },
  },
});
assert.deepEqual(readdirSync(resolve(root, ".github")).sort(), [
  "PULL_REQUEST_TEMPLATE.md",
  "ci-policy.mjs",
  "dependabot.yml",
  "merge-policy.json",
  "workflows",
]);
assert.deepEqual(readdirSync(resolve(root, ".githooks")).sort(), ["pre-commit"]);

const portable = readJson("plugin.json");
assert.equal(
  portable.$schema,
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
);
assert.equal(portable.name, "coffee-chat");
assert.equal(typeof portable.version, "string");
assert.equal(typeof portable.description, "string");
assert.deepEqual(Object.keys(portable).sort(), [
  "$schema",
  "author",
  "description",
  "homepage",
  "keywords",
  "license",
  "name",
  "repository",
  "version",
]);

const codex = readJson(".codex-plugin/plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
assert.deepEqual(readdirSync(resolve(root, ".codex-plugin")).sort(), ["plugin.json"]);
assert.deepEqual(readdirSync(resolve(root, ".claude-plugin")).sort(), ["plugin.json"]);
for (const [label, manifest] of [
  ["codex", codex],
  ["claude", claude],
]) {
  for (const key of [
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
  ]) {
    assert.deepEqual(manifest[key], portable[key], `${label}.${key}`);
  }
}
assert.equal(codex.skills, "./skills/");

assert.deepEqual(readJson(".github/merge-policy.json"), {
  merge_method: "squash",
  required_approvals: 0,
  required_code_owner_reviews: 0,
  required_last_push_approvals: 0,
  merge_queue: false,
  required_events: ["pull_request"],
  eligible_author_associations: ["OWNER", "MEMBER"],
  eligible_bot_logins: ["dependabot[bot]"],
  custom_merge_controller: false,
  required_checks: [
    {
      context: "OpenBoa Coffee trusted required / OpenBoa Coffee trusted required",
      integration_id: 15368,
    },
  ],
  protected_paths: [
    "/plugin.json",
    "/.github/**",
    "/.githooks/**",
    "/.gitleaksignore",
    "/.gitleaks.toml",
    "/.codex-plugin/**",
    "/.claude-plugin/**",
    "/AGENTS.md",
    "/CODEOWNERS",
    "/SECURITY.md",
    "/.npmrc",
    "/package.json",
    "/package-lock.json",
    "/npm-shrinkwrap.json",
    "/skills/**",
  ],
  codeql_enforcement: "trusted_central_aggregate",
  sensitive_review: {
    enforcement: "github_environment",
    environment: "coffee-security",
    required_approvals: 1,
    prevent_self_review: false,
  },
});

for (const forbidden of [
  "mcp.json",
  ".mcp.json",
  "hooks",
  "commands",
  "agents",
  "assets",
  ".agents",
  "config",
  "contract",
  "docs",
  "marketplace",
  "runtime",
  "scripts",
  "tests",
]) {
  assert.equal(existsSync(resolve(root, forbidden)), false, forbidden);
}

assert.equal(
  readFileSync(resolve(root, ".github/dependabot.yml"), "utf8"),
  `version: 2

updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    commit-message:
      prefix: deps
    allow:
      - dependency-name: "*"
        update-types:
          - version-update:semver-minor
          - version-update:semver-patch
    groups:
      security:
        applies-to: security-updates
        patterns:
          - "*"
      production-minor-patch:
        applies-to: version-updates
        dependency-type: production
        update-types:
          - minor
          - patch
        patterns:
          - "*"
      development-minor-patch:
        applies-to: version-updates
        dependency-type: development
        update-types:
          - minor
          - patch
        patterns:
          - "*"

  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    commit-message:
      prefix: deps
    allow:
      - dependency-name: "*"
        update-types:
          - version-update:semver-minor
          - version-update:semver-patch
    groups:
      security:
        applies-to: security-updates
        patterns:
          - "*"
      compatible-actions:
        applies-to: version-updates
        update-types:
          - minor
          - patch
        patterns:
          - "*"
`,
  "Dependabot policy must remain bounded to approved update lanes",
);
assert.equal(
  readFileSync(resolve(root, "CODEOWNERS"), "utf8"),
  `# Ownership routes review context; GitHub requires zero human approvals.
/.github/** @openboa
/.codex-plugin/** @openboa
/.claude-plugin/** @openboa
/AGENTS.md @openboa
/CODEOWNERS @openboa
/.npmrc @openboa-ai/security-maintainers
/LICENSE @openboa
/SECURITY.md @openboa
/skills/** @openboa
/package.json @openboa
/package-lock.json @openboa
/npm-shrinkwrap.json @openboa-ai/security-maintainers
/plugin.json @openboa
`,
  "CODEOWNERS must preserve the product ownership routes",
);
assert.match(
  readFileSync(resolve(root, "SECURITY.md"), "utf8"),
  /security@openboa\.ai/u,
  "SECURITY.md must provide a private reporting channel",
);

const skillRoot = resolve(root, "skills");
const skills = readdirSync(skillRoot).sort();
assert.deepEqual(skills, ["brew", "roast"]);
for (const skill of skills) {
  const path = resolve(skillRoot, skill, "SKILL.md");
  assert.equal(existsSync(path), true, skill);
  assert.deepEqual(readdirSync(resolve(skillRoot, skill)).sort(), ["SKILL.md"], skill);
  const source = readFileSync(path, "utf8");
  assert.match(source, /^---\n/u, skill);
  assert.match(source, new RegExp(`^name: ${skill}$`, "mu"), skill);
  assert.match(source, /^description: .+$/mu, skill);
}

console.log("Coffee Chat structure and manifest policy passed.");
