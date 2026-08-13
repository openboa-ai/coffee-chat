import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadPolicyParser } from "./policy-bootstrap.mjs";

const controlRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(process.env.CI_POLICY_ROOT ?? controlRoot);
const { isAlias, isMap, isSeq, parseDocument, visit } =
  loadPolicyParser(controlRoot);
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
const expectedWorkflows = [
  "codeql.yml",
  "dependency-review.yml",
  "quality.yml",
  "secret-boundary.yml",
];
const actionPins = new Set([
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
  "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  "github/codeql-action/analyze@5595ccaf912efad79be6eef63a5619ff05969be3",
  "github/codeql-action/init@5595ccaf912efad79be6eef63a5619ff05969be3",
]);

function read(path) {
  return readFileSync(pathAt(path), "utf8");
}

function loadYaml(path) {
  const document = parseDocument(read(path), {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(
    document.errors,
    [],
    `${path}: invalid or duplicate YAML mapping`,
  );
  visit(document, (_key, node) => {
    assert.equal(isAlias(node), false, `${path}: YAML aliases are not allowed`);
    if (isMap(node)) {
      for (const pair of node.items) {
        assert.equal(
          pair.key?.toString() === "<<",
          false,
          `${path}: YAML merge keys are not allowed`,
        );
      }
    }
    if (isSeq(node)) assert.ok(Array.isArray(node.items));
  });
  return document.toJS({ maxAliasCount: 0 });
}

function exactKeys(value, keys, label) {
  assert.equal(
    value !== null && typeof value === "object" && !Array.isArray(value),
    true,
    `${label}: object required`,
  );
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label);
}

function exactPermissions(value, expected, label) {
  assert.deepEqual(value, expected, `${label}: least permissions`);
}

function stepNamed(job, name) {
  const matching = (job.steps ?? []).filter((step) => step.name === name);
  assert.equal(matching.length, 1, `${name}: exactly one owning step`);
  return matching[0];
}

function stepIndex(job, name) {
  const index = (job.steps ?? []).findIndex((step) => step.name === name);
  assert.ok(index >= 0, `${name}: missing`);
  return index;
}

function requireCommand(job, name, command) {
  const step = stepNamed(job, name);
  exactKeys(step, ["name", "run"], `${name}: exact step`);
  assert.equal(step.run, command, `${name}: exact command`);
}

function requireTriggers(name, workflow) {
  exactKeys(workflow.on, ["pull_request"], `${name}: exact PR-only triggers`);
}

function requireTrustedCodeqlTriggers(workflow) {
  const triggers = Object.keys(workflow.on).sort();
  assert.equal(
    JSON.stringify(triggers) ===
      JSON.stringify(["pull_request", "pull_request_target"]) ||
      JSON.stringify(triggers) === JSON.stringify(["pull_request_target"]),
    true,
    "CodeQL must use the trusted-base transition or final trigger",
  );
}

function requireConcurrency(name, workflow) {
  assert.deepEqual(
    workflow.concurrency,
    {
      group:
        "${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}",
      "cancel-in-progress": true,
    },
    `${name}: bounded concurrency`,
  );
}

function eachNode(value, callback) {
  callback(value);
  if (Array.isArray(value)) {
    for (const entry of value) eachNode(entry, callback);
  } else if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) eachNode(entry, callback);
  }
}

function requirePinnedActions(name, workflow) {
  eachNode(workflow, (value) => {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.hasOwn(value, "uses")
    ) {
      assert.equal(typeof value.uses, "string", `${name}: action is a string`);
      assert.equal(actionPins.has(value.uses), true, `${name}: ${value.uses}`);
    }
  });
}

function requireBoundedJobs(name, workflow) {
  assert.ok(workflow.jobs && Object.keys(workflow.jobs).length > 0);
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.equal(
      Number.isInteger(job["timeout-minutes"]) &&
        job["timeout-minutes"] > 0 &&
        job["timeout-minutes"] <= 30,
      true,
      `${name}/${jobName}: bounded timeout`,
    );
    if (name === "codeql.yml" && jobName === "analyze") {
      exactPermissions(
        job.permissions,
        { contents: "read", actions: "read", "security-events": "write" },
        `${name}/${jobName}`,
      );
    } else if (job.permissions !== undefined) {
      assert.deepEqual(
        job.permissions,
        { contents: "read" },
        `${name}/${jobName}: read-only permissions`,
      );
    }
  }
}

assert.deepEqual(readdirSync(workflowRoot).sort(), expectedWorkflows);
const workflows = new Map(
  expectedWorkflows.map((name) => [
    name,
    loadYaml(`.github/workflows/${name}`),
  ]),
);

for (const [name, workflow] of workflows) {
  requirePinnedActions(name, workflow);
  requireBoundedJobs(name, workflow);
  requireConcurrency(name, workflow);
  if (name === "secret-boundary.yml") continue;
  if (name === "codeql.yml") {
    requireTrustedCodeqlTriggers(workflow);
    exactPermissions(workflow.permissions, {}, `${name}: workflow permissions`);
    continue;
  }
  requireTriggers(name, workflow);
  exactPermissions(workflow.permissions, {}, `${name}: workflow permissions`);
}

const codeql = workflows.get("codeql.yml");
exactKeys(
  codeql,
  ["name", "on", "permissions", "concurrency", "jobs"],
  "CodeQL workflow",
);
const codeqlJob = codeql.jobs.analyze;
assert.deepEqual(Object.keys(codeql.jobs), ["analyze"]);
exactKeys(
  codeqlJob,
  ["name", "if", "runs-on", "timeout-minutes", "permissions", "steps"],
  "CodeQL job",
);
assert.equal(
  codeqlJob.if,
  "((github.event.pull_request.author_association == 'OWNER' || github.event.pull_request.author_association == 'MEMBER') && github.actor == github.event.pull_request.user.login && github.event.pull_request.head.repo.full_name == github.repository) || (github.actor == 'dependabot[bot]' && github.event.pull_request.user.login == 'dependabot[bot]' && github.event.pull_request.head.repo.full_name == github.repository)",
);
assert.deepEqual(codeqlJob.steps, [
  {
    name: "Check out repository without persisted credentials",
    uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    with: {
      repository: "${{ github.event.pull_request.head.repo.full_name }}",
      ref: "${{ github.event.pull_request.head.sha }}",
      "persist-credentials": false,
    },
  },
  {
    name: "Initialize CodeQL",
    uses: "github/codeql-action/init@5595ccaf912efad79be6eef63a5619ff05969be3",
    with: { languages: "javascript-typescript", "build-mode": "none" },
  },
  {
    name: "Analyze with CodeQL",
    uses: "github/codeql-action/analyze@5595ccaf912efad79be6eef63a5619ff05969be3",
  },
]);

const dependency = workflows.get("dependency-review.yml");
exactKeys(
  dependency,
  ["name", "on", "permissions", "concurrency", "jobs"],
  "dependency review workflow",
);
assert.deepEqual(Object.keys(dependency.jobs), ["dependency-review"]);
const dependencyJob = dependency.jobs["dependency-review"];
exactKeys(
  dependencyJob,
  ["name", "runs-on", "timeout-minutes", "permissions", "steps"],
  "dependency review job",
);
exactPermissions(
  dependencyJob.permissions,
  { contents: "read" },
  "dependency review",
);
assert.deepEqual(dependencyJob.steps, [
  {
    name: "Review pull request dependencies",
    uses: "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
    with: {
      "comment-summary-in-pr": "never",
      "fail-on-severity": "moderate",
      "fail-on-scopes": "runtime,development,unknown",
      "show-patched-versions": true,
    },
  },
]);

const qualityWorkflow = workflows.get("quality.yml");
exactKeys(
  qualityWorkflow,
  ["name", "on", "permissions", "concurrency", "jobs"],
  "quality workflow",
);
exactKeys(qualityWorkflow.jobs, ["quality", "aggregate"], "quality jobs");
const quality = qualityWorkflow.jobs.quality;
exactKeys(
  quality,
  ["name", "runs-on", "timeout-minutes", "permissions", "steps"],
  "quality job",
);
exactPermissions(quality.permissions, { contents: "read" }, "quality job");
const gateIndex = stepIndex(quality, "Verify trusted pull request author");
const checkoutIndex = stepIndex(
  quality,
  "Check out repository without persisted credentials",
);
assert.ok(gateIndex < checkoutIndex, "author gate must precede checkout");
const gate = quality.steps[gateIndex];
assert.deepEqual(gate, {
  name: "Verify trusted pull request author",
  env: {
    ACTOR: "${{ github.actor }}",
    AUTHOR_ASSOCIATION: "${{ github.event.pull_request.author_association }}",
    BASE_REPOSITORY: "${{ github.repository }}",
    HEAD_REPOSITORY: "${{ github.event.pull_request.head.repo.full_name }}",
    PR_AUTHOR: "${{ github.event.pull_request.user.login }}",
  },
  run: [
    'case "$AUTHOR_ASSOCIATION" in',
    "  OWNER|MEMBER)",
    '    test "$ACTOR" = "$PR_AUTHOR"',
    '    test "$HEAD_REPOSITORY" = "$BASE_REPOSITORY"',
    "    ;;",
    "  *)",
    '    test "$ACTOR" = "dependabot[bot]"',
    '    test "$PR_AUTHOR" = "dependabot[bot]"',
    '    test "$HEAD_REPOSITORY" = "$BASE_REPOSITORY"',
    "    ;;",
    "esac",
    "",
  ].join("\n"),
});
const checkout = quality.steps[checkoutIndex];
assert.deepEqual(checkout, {
  name: "Check out repository without persisted credentials",
  uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  with: {
    "fetch-depth": 0,
    "persist-credentials": false,
    ref: "${{ github.event.pull_request.head.sha }}",
  },
});
requireCommand(
  quality,
  "Install immutable Gitleaks",
  ".github/scripts/install-gitleaks.sh",
);
const secretScan = stepNamed(
  quality,
  "Scan complete history, tree, and raw blobs",
);
exactKeys(secretScan, ["name", "env", "run"], "quality secret scan step");
assert.deepEqual(secretScan.env, {
  BASE_SHA: "${{ github.event.pull_request.base.sha || '' }}",
  HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
});
assert.equal(
  secretScan.run,
  [
    "set -o pipefail",
    "test ! -e .gitleaks.toml",
    "test ! -e .gitleaksignore",
    'gitleaks git --config "$GITLEAKS_TRUSTED_CONFIG" \\',
    "  --gitleaks-ignore-path /dev/null --ignore-gitleaks-allow \\",
    "  --redact --no-banner .",
    'gitleaks dir --config "$GITLEAKS_TRUSTED_CONFIG" \\',
    "  --gitleaks-ignore-path /dev/null --ignore-gitleaks-allow \\",
    "  --redact --no-banner .",
    'blob_dir="$(mktemp -d)"',
    'if test -n "$BASE_SHA"; then',
    '  object_range="$BASE_SHA..$HEAD_SHA"',
    "else",
    '  object_range="$HEAD_SHA"',
    "fi",
    'git rev-list --objects "$object_range" |',
    "  cut -d' ' -f1 |",
    "  git cat-file --batch-check='%(objectname) %(objecttype)' |",
    "  awk '$2 == \"blob\" { print $1 }' |",
    "  while read -r object_id; do",
    '    git cat-file blob "$object_id" > "$blob_dir/$object_id"',
    "  done",
    'gitleaks dir --config "$GITLEAKS_TRUSTED_CONFIG" \\',
    "  --gitleaks-ignore-path /dev/null --ignore-gitleaks-allow \\",
    '  --redact --no-banner "$blob_dir"',
    "",
  ].join("\n"),
  "quality secret scan: exact trusted command",
);
const setupNode = stepNamed(quality, "Set up Node.js");
assert.deepEqual(setupNode, {
  name: "Set up Node.js",
  uses: "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  with: { "node-version": 24, cache: "npm" },
});
const commandSteps = [
  [
    "Authenticate isolated policy parser lock",
    "node .github/policy-bootstrap.mjs",
  ],
  [
    "Install authenticated policy parser",
    "npm ci --ignore-scripts --prefix .github/policy-parser",
  ],
  [
    "Audit authenticated policy parser dependencies",
    "npm audit --audit-level=moderate --prefix .github/policy-parser",
  ],
  [
    "Enforce repository policy before delegated scripts",
    "node .github/ci-policy.mjs",
  ],
  [
    "Install locked dependencies without lifecycle scripts",
    "npm ci --ignore-scripts",
  ],
  ["Audit dependencies", "npm audit --audit-level=moderate"],
  ["Check formatting", "npm run format:check"],
  ["Check types", "npm run typecheck"],
  ["Run shell tests", "npm test"],
  ["Verify README explanatory images offline", "npm run readme:assets:verify"],
  ["Build package", "npm run build"],
  ["Run package smoke", "npm run package:smoke"],
  ["Check repository policy", "npm run policy"],
];
for (const [name, command] of commandSteps)
  requireCommand(quality, name, command);
assert.deepEqual(
  quality.steps.map((step) => step.name),
  [
    "Verify trusted pull request author",
    "Check out repository without persisted credentials",
    "Install immutable Gitleaks",
    "Scan complete history, tree, and raw blobs",
    "Set up Node.js",
    ...commandSteps.map(([name]) => name),
  ],
  "quality job: exact ordered steps",
);
const aggregate = qualityWorkflow.jobs.aggregate;
exactKeys(
  aggregate,
  ["name", "if", "needs", "runs-on", "timeout-minutes", "permissions", "steps"],
  "aggregate job",
);
exactPermissions(aggregate.permissions, { contents: "read" }, "aggregate job");
assert.equal(aggregate.if, "always()");
assert.equal(aggregate.needs, "quality");
assert.deepEqual(aggregate.steps, [
  {
    name: "Interpret required lane state",
    env: { QUALITY_RESULT: "${{ needs.quality.result }}" },
    run: 'test "$QUALITY_RESULT" = success',
  },
]);

const boundary = workflows.get("secret-boundary.yml");
exactKeys(
  boundary,
  ["name", "on", "permissions", "concurrency", "jobs"],
  "secret workflow",
);
exactKeys(
  boundary.on,
  ["pull_request_target", "workflow_dispatch"],
  "secret triggers",
);
assert.deepEqual(boundary.on, {
  pull_request_target: {
    types: ["opened", "synchronize", "reopened", "ready_for_review"],
  },
  workflow_dispatch: null,
});
exactPermissions(boundary.permissions, { contents: "read" }, "secret workflow");
assert.deepEqual(Object.keys(boundary.jobs), ["secret-boundary"]);
const boundaryJob = boundary.jobs["secret-boundary"];
exactKeys(
  boundaryJob,
  ["name", "if", "runs-on", "timeout-minutes", "steps"],
  "secret boundary job",
);
assert.equal(
  boundaryJob.if,
  "github.event_name == 'workflow_dispatch' || (((github.event.pull_request.author_association == 'OWNER' || github.event.pull_request.author_association == 'MEMBER') && github.actor == github.event.pull_request.user.login && github.event.pull_request.head.repo.full_name == github.repository) || (github.actor == 'dependabot[bot]' && github.event.pull_request.user.login == 'dependabot[bot]' && github.event.pull_request.head.repo.full_name == github.repository))",
);
assert.equal(boundaryJob["runs-on"], "ubuntu-24.04");
const trustedCheckout = stepNamed(
  boundaryJob,
  "Check out trusted security controls",
);
assert.deepEqual(trustedCheckout, {
  name: "Check out trusted security controls",
  uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  with: {
    ref: "${{ github.event.pull_request.base.sha || github.sha }}",
    "fetch-depth": 1,
    "persist-credentials": false,
    path: "trusted",
  },
});
requireCommand(
  boundaryJob,
  "Install immutable Gitleaks from trusted base",
  "trusted/.github/scripts/install-gitleaks.sh",
);
const candidateCheckout = stepNamed(
  boundaryJob,
  "Check out candidate as data only",
);
assert.deepEqual(candidateCheckout, {
  name: "Check out candidate as data only",
  uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  with: {
    repository:
      "${{ github.event.pull_request.head.repo.full_name || github.repository }}",
    ref: "${{ github.event.pull_request.head.sha || github.sha }}",
    "fetch-depth": 0,
    "persist-credentials": false,
    path: "candidate",
  },
});
const boundaryScan = stepNamed(
  boundaryJob,
  "Scan candidate without executing it",
);
exactKeys(boundaryScan, ["name", "env", "run"], "secret boundary scan step");
assert.deepEqual(boundaryScan.env, {
  BASE_SHA: "${{ github.event.pull_request.base.sha || '' }}",
  BASE_REPOSITORY: "${{ github.repository }}",
  HEAD_SHA: "${{ github.event.pull_request.head.sha || github.sha }}",
});
assert.equal(
  boundaryScan.run,
  [
    "set -o pipefail",
    "test ! -e candidate/.gitleaks.toml",
    "test ! -e candidate/.gitleaksignore",
    "ignore_path=/dev/null",
    'gitleaks git --config "$GITLEAKS_TRUSTED_CONFIG" \\',
    '  --gitleaks-ignore-path "$ignore_path" --ignore-gitleaks-allow \\',
    '  --redact --no-banner "$GITHUB_WORKSPACE/candidate"',
    'gitleaks dir --config "$GITLEAKS_TRUSTED_CONFIG" \\',
    '  --gitleaks-ignore-path "$ignore_path" --ignore-gitleaks-allow \\',
    '  --redact --no-banner "$GITHUB_WORKSPACE/candidate"',
    'blob_dir="$(mktemp -d)"',
    'if test -n "$BASE_SHA"; then',
    "  git -C candidate fetch --no-tags --depth=1 \\",
    '    "https://github.com/$BASE_REPOSITORY.git" "$BASE_SHA"',
    '  object_range="$BASE_SHA..$HEAD_SHA"',
    "else",
    '  object_range="$HEAD_SHA"',
    "fi",
    'git -C candidate rev-list --objects "$object_range" |',
    "  cut -d' ' -f1 |",
    "  git -C candidate cat-file --batch-check='%(objectname) %(objecttype)' |",
    "  awk '$2 == \"blob\" { print $1 }' |",
    "  while read -r object_id; do",
    '    git -C candidate cat-file blob "$object_id" > "$blob_dir/$object_id"',
    "  done",
    'gitleaks dir --config "$GITLEAKS_TRUSTED_CONFIG" \\',
    '  --gitleaks-ignore-path "$ignore_path" --ignore-gitleaks-allow \\',
    '  --redact --no-banner "$blob_dir"',
    "",
  ].join("\n"),
  "secret boundary: exact trusted command",
);
assert.deepEqual(
  boundaryJob.steps.map((step) => step.name),
  [
    "Check out trusted security controls",
    "Install immutable Gitleaks from trusted base",
    "Check out candidate as data only",
    "Scan candidate without executing it",
  ],
  "secret boundary: exact ordered steps",
);
assert.doesNotMatch(
  read(".github/workflows/secret-boundary.yml"),
  /npm |node |secrets\./u,
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

const dependabot = loadYaml(".github/dependabot.yml");
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
  { context: "Coffee Chat required", integration_id: 15368 },
  { context: "Coffee Chat dependency review", integration_id: 15368 },
  { context: "Secret boundary", integration_id: 15368 },
  {
    context: "Coffee Chat CodeQL JavaScript-TypeScript",
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
  "/npm-shrinkwrap.json",
  "/runtime/**",
  "/scripts/**",
  "/skills/**",
]);
assert.equal(mergePolicy.codeql_enforcement, "native_code_scanning");
assert.deepEqual(mergePolicy.sensitive_review, {
  enforcement: "github_repository_ruleset",
  required_team: "security-maintainers",
  required_approvals: 1,
  bypass_actors: [],
});

const agents = read("AGENTS.md");
assert.match(agents, /GitHub-native\s+squash auto-merge/u);
assert.match(agents, /organization ruleset/u);
assert.match(agents, /security-maintainers/u);
assert.match(agents, /Do not\s+widen[\s\S]*custom write-token merge/u);
const pullRequestTemplate = read(".github/PULL_REQUEST_TEMPLATE.md");
assert.match(pullRequestTemplate, /Sensitive-path declaration/u);
assert.match(pullRequestTemplate, /organization ruleset/u);

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
