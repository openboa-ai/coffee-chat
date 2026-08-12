import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";

const workflowRoot = ".github/workflows";
const expectedWorkflows = [
  "codeql.yml",
  "dependency-review.yml",
  "quality.yml",
  "secret-boundary.yml",
];
assert.deepEqual(readdirSync(workflowRoot).sort(), expectedWorkflows);

const parsed = new Map(
  expectedWorkflows.map((name) => [
    name,
    parse(readFileSync(`${workflowRoot}/${name}`, "utf8")),
  ]),
);
for (const [name, workflow] of parsed) {
  if (name === "secret-boundary.yml") continue;
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
  for (const job of Object.values(workflow.jobs)) {
    for (const step of job.steps ?? []) {
      if (step.uses) {
        assert.match(
          step.uses,
          /^[-\w]+\/[-\w]+(?:\/[-\w]+)?@[0-9a-f]{40}$/u,
          `${name}: ${step.uses}`,
        );
      }
    }
  }
}

const boundarySource = readFileSync(
  `${workflowRoot}/secret-boundary.yml`,
  "utf8",
);
const boundary = parsed.get("secret-boundary.yml");
assert.equal(Object.hasOwn(boundary.on, "pull_request_target"), true);
assert.deepEqual(boundary.permissions, { contents: "read" });
assert.match(boundarySource, /path: trusted/u);
assert.match(boundarySource, /path: candidate/u);
assert.match(boundarySource, /gitleaks git/u);
assert.match(boundarySource, /gitleaks dir/u);
assert.doesNotMatch(boundarySource, /npm |node |secrets\./u);

const quality = parsed.get("quality.yml").jobs.quality;
assert.deepEqual(quality.permissions, { contents: "read" });
const steps = quality.steps;
const gateIndex = steps.findIndex(
  ({ name }) => name === "Verify trusted pull request author",
);
const checkoutIndex = steps.findIndex(({ uses }) =>
  uses?.startsWith("actions/checkout@"),
);
assert.ok(gateIndex >= 0 && gateIndex < checkoutIndex);
assert.match(steps[gateIndex].run, /OWNER\|MEMBER/u);
assert.match(steps[gateIndex].run, /exit 1/u);
assert.doesNotMatch(steps[gateIndex].run, /COLLABORATOR|PR_AUTHOR|openboa/u);
assert.equal(steps[checkoutIndex].with["persist-credentials"], false);

const qualitySource = readFileSync(`${workflowRoot}/quality.yml`, "utf8");
for (const command of [
  "npm run format:check",
  "npm run typecheck",
  "npm test",
  "npm run readme:assets:verify",
  "npm run build",
  "npm run package:smoke",
  "npm run policy",
]) {
  assert.ok(qualitySource.includes(command), command);
}

const mergePolicy = JSON.parse(
  readFileSync(".github/merge-policy.json", "utf8"),
);
assert.equal(mergePolicy.merge_method, "squash");
assert.equal(mergePolicy.required_approvals, 0);
assert.deepEqual(mergePolicy.eligible_author_associations, ["OWNER", "MEMBER"]);
assert.equal("eligible_author_logins" in mergePolicy, false);
assert.equal(mergePolicy.custom_merge_controller, false);
assert.ok(mergePolicy.required_checks.includes("Secret boundary"));

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
  assert.equal(existsSync(path), false, `forbidden path: ${path}`);
}
process.stdout.write(`${JSON.stringify({ status: "policy_passed" })}\n`);
