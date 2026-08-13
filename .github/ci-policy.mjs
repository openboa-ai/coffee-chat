import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAlias, isMap, isSeq, parseDocument, visit } from "yaml";

const root = process.env.CI_POLICY_ROOT ?? ".";
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
  assert.equal(stepNamed(job, name).run, command, `${name}: exact command`);
}

function requireTriggers(name, workflow) {
  assert.equal(
    Object.hasOwn(workflow.on, "pull_request"),
    true,
    `${name}: pull_request`,
  );
  assert.equal(
    Object.hasOwn(workflow.on, "merge_group"),
    true,
    `${name}: merge_group`,
  );
  assert.equal(
    Object.hasOwn(workflow.on, "pull_request_target"),
    false,
    `${name}: candidate workflows cannot use pull_request_target`,
  );
}

function requireConcurrency(name, workflow) {
  assert.deepEqual(
    workflow.concurrency,
    {
      group:
        "${{ github.workflow }}-${{ github.event.pull_request.number || github.event.merge_group.head_sha || github.ref }}",
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
  requireTriggers(name, workflow);
  exactPermissions(workflow.permissions, {}, `${name}: workflow permissions`);
}

const codeql = workflows.get("codeql.yml");
assert.deepEqual(codeql.on.push, { branches: ["main"] });
const codeqlJob = codeql.jobs.analyze;
assert.deepEqual(Object.keys(codeql.jobs), ["analyze"]);
const codeqlCheckout = stepNamed(
  codeqlJob,
  "Check out repository without persisted credentials",
);
assert.equal(codeqlCheckout.with["persist-credentials"], false);
assert.equal(
  stepNamed(codeqlJob, "Initialize CodeQL").with["build-mode"],
  "none",
);
assert.equal(
  stepNamed(codeqlJob, "Initialize CodeQL").with.languages,
  "javascript-typescript",
);

const dependency = workflows.get("dependency-review.yml");
assert.deepEqual(Object.keys(dependency.jobs), ["dependency-review"]);
const dependencyJob = dependency.jobs["dependency-review"];
exactPermissions(
  dependencyJob.permissions,
  { contents: "read" },
  "dependency review",
);
for (const name of [
  "Review pull request dependencies",
  "Review merge group dependencies",
]) {
  const step = stepNamed(dependencyJob, name);
  assert.equal(step.with["comment-summary-in-pr"], "never");
  assert.equal(step.with["fail-on-severity"], "moderate");
  assert.equal(step.with["fail-on-scopes"], "runtime,development,unknown");
  assert.equal(step.with["show-patched-versions"], true);
}
const mergeDependency = stepNamed(
  dependencyJob,
  "Review merge group dependencies",
);
assert.equal(
  mergeDependency.with["base-ref"],
  "${{ github.event.merge_group.base_sha }}",
);
assert.equal(
  mergeDependency.with["head-ref"],
  "${{ github.event.merge_group.head_sha }}",
);

const qualityWorkflow = workflows.get("quality.yml");
exactKeys(qualityWorkflow.jobs, ["quality", "aggregate"], "quality jobs");
const quality = qualityWorkflow.jobs.quality;
exactPermissions(quality.permissions, { contents: "read" }, "quality job");
const gateIndex = stepIndex(quality, "Verify trusted pull request author");
const checkoutIndex = stepIndex(
  quality,
  "Check out repository without persisted credentials",
);
assert.ok(gateIndex < checkoutIndex, "author gate must precede checkout");
const gate = quality.steps[gateIndex];
assert.equal(gate.if, "github.event_name == 'pull_request'");
assert.deepEqual(gate.env, {
  AUTHOR_ASSOCIATION: "${{ github.event.pull_request.author_association }}",
});
assert.match(gate.run, /case "\$AUTHOR_ASSOCIATION" in/u);
assert.match(gate.run, /OWNER\|MEMBER\)/u);
assert.match(gate.run, /exit 1/u);
assert.doesNotMatch(gate.run, /COLLABORATOR|PR_AUTHOR|openboa/u);
const checkout = quality.steps[checkoutIndex];
assert.equal(checkout.with["fetch-depth"], 0);
assert.equal(checkout.with["persist-credentials"], false);
assert.equal(
  checkout.with.ref,
  "${{ github.event.pull_request.head.sha || github.event.merge_group.head_sha || github.sha }}",
);
requireCommand(
  quality,
  "Install immutable Gitleaks",
  ".github/scripts/install-gitleaks.sh",
);
const secretScan = stepNamed(
  quality,
  "Scan complete history, tree, and raw blobs",
);
for (const fragment of [
  "gitleaks git",
  "gitleaks dir",
  'git rev-list --objects "$object_range"',
  "git cat-file --batch-check='%(objectname) %(objecttype)'",
  'git cat-file blob "$object_id" > "$blob_dir/$object_id"',
  "--ignore-gitleaks-allow",
]) {
  assert.ok(
    secretScan.run.includes(fragment),
    `quality secret scan: ${fragment}`,
  );
}
const setupNode = stepNamed(quality, "Set up Node.js");
assert.deepEqual(setupNode.with, { "node-version": 24, cache: "npm" });
const commandSteps = [
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
const orderedNames = commandSteps.map(([name]) => stepIndex(quality, name));
assert.deepEqual(
  orderedNames,
  [...orderedNames].sort((left, right) => left - right),
);
const aggregate = qualityWorkflow.jobs.aggregate;
exactPermissions(aggregate.permissions, { contents: "read" }, "aggregate job");
assert.equal(aggregate.if, "always()");
assert.equal(aggregate.needs, "quality");
assert.match(
  stepNamed(aggregate, "Interpret required lane state").run,
  /success\)/u,
);
assert.match(
  stepNamed(aggregate, "Interpret required lane state").run,
  /skipped\)/u,
);
assert.match(
  stepNamed(aggregate, "Interpret required lane state").run,
  /cancelled\)/u,
);

const boundarySource = read(".github/workflows/secret-boundary.yml");
const boundary = workflows.get("secret-boundary.yml");
exactKeys(
  boundary.on,
  ["pull_request_target", "workflow_dispatch"],
  "secret triggers",
);
exactPermissions(boundary.permissions, { contents: "read" }, "secret workflow");
assert.deepEqual(Object.keys(boundary.jobs), ["secret-boundary"]);
const boundaryJob = boundary.jobs["secret-boundary"];
assert.match(boundaryJob.if, /OWNER/u);
assert.match(boundaryJob.if, /MEMBER/u);
for (const fragment of [
  "path: trusted",
  "path: candidate",
  "gitleaks git",
  "gitleaks dir",
  "git -C candidate rev-list --objects",
  "git -C candidate cat-file --batch-check",
  'git -C candidate cat-file blob "$object_id" > "$blob_dir/$object_id"',
]) {
  assert.ok(boundarySource.includes(fragment), `secret boundary: ${fragment}`);
}
assert.doesNotMatch(boundarySource, /npm |node |secrets\./u);
const trustedCheckout = stepNamed(
  boundaryJob,
  "Check out trusted security controls",
);
assert.equal(
  trustedCheckout.with.ref,
  "${{ github.event.pull_request.base.sha || github.sha }}",
);
assert.equal(trustedCheckout.with["persist-credentials"], false);
const candidateCheckout = stepNamed(
  boundaryJob,
  "Check out candidate as data only",
);
assert.equal(candidateCheckout.with["fetch-depth"], 0);
assert.equal(candidateCheckout.with["persist-credentials"], false);

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts.policy,
  "node --test tests/workflow-policy.test.mjs && node .github/ci-policy.mjs",
);
assert.equal(packageJson.devDependencies.yaml, "2.9.0");

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
assert.equal(mergePolicy.merge_method, "squash");
assert.equal(mergePolicy.required_approvals, 0);
assert.deepEqual(mergePolicy.eligible_author_associations, ["OWNER", "MEMBER"]);
assert.equal("eligible_author_logins" in mergePolicy, false);
assert.equal(mergePolicy.custom_merge_controller, false);
assert.deepEqual(mergePolicy.required_checks, [
  "Coffee Chat required",
  "Coffee Chat dependency review",
  "Secret boundary",
  "Coffee Chat CodeQL JavaScript-TypeScript",
]);
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
