import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";

const workflowRoot = ".github/workflows";
const expectedWorkflows = [
  "codeql.yml",
  "dependency-review.yml",
  "quality.yml",
];
assert.deepEqual(readdirSync(workflowRoot).sort(), expectedWorkflows);

const parsed = new Map(
  expectedWorkflows.map((name) => [
    name,
    parse(readFileSync(`${workflowRoot}/${name}`, "utf8")),
  ]),
);
for (const [name, workflow] of parsed) {
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
