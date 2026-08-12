import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const workflowRoot = ".github/workflows";
const workflows = readdirSync(workflowRoot).sort();

function workflow(name) {
  return parse(readFileSync(`${workflowRoot}/${name}`, "utf8"));
}

function pinned(value) {
  return /^[-\w]+\/[-\w]+(?:\/[-\w]+)?@[0-9a-f]{40}$/u.test(value);
}

test("CI contains lean quality and an immutable secret boundary", () => {
  assert.deepEqual(workflows, [
    "codeql.yml",
    "dependency-review.yml",
    "quality.yml",
    "secret-boundary.yml",
  ]);
  for (const name of workflows) {
    const source = readFileSync(`${workflowRoot}/${name}`, "utf8");
    if (name === "secret-boundary.yml") continue;
    assert.doesNotMatch(source, /pull_request_target/u);
    const parsed = workflow(name);
    assert.equal(
      Object.hasOwn(parsed.on, "pull_request"),
      true,
      `${name}: pull_request`,
    );
    assert.equal(
      Object.hasOwn(parsed.on, "merge_group"),
      true,
      `${name}: merge_group`,
    );
    for (const job of Object.values(parsed.jobs)) {
      for (const step of job.steps ?? []) {
        if (step.uses) assert.equal(pinned(step.uses), true, step.uses);
      }
    }
  }
});

test("secret scanning executes only trusted controls against candidate data", () => {
  const source = readFileSync(`${workflowRoot}/secret-boundary.yml`, "utf8");
  const parsed = workflow("secret-boundary.yml");
  assert.equal(Object.hasOwn(parsed.on, "pull_request_target"), true);
  assert.deepEqual(parsed.permissions, { contents: "read" });
  assert.match(source, /path: trusted/u);
  assert.match(source, /path: candidate/u);
  assert.match(source, /gitleaks git/u);
  assert.match(source, /gitleaks dir/u);
  assert.doesNotMatch(source, /npm |node |secrets\./u);
});

test("candidate execution is member-gated before read-only checkout", () => {
  const quality = workflow("quality.yml");
  const steps = quality.jobs.quality.steps;
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
  assert.deepEqual(quality.jobs.quality.permissions, { contents: "read" });
  assert.equal(steps[checkoutIndex].with["persist-credentials"], false);
});

test("quality runs the complete lean shell gate", () => {
  const source = readFileSync(`${workflowRoot}/quality.yml`, "utf8");
  for (const command of [
    "npm run format:check",
    "npm run typecheck",
    "npm test",
    "npm run build",
    "npm run package:smoke",
    "npm run policy",
  ]) {
    assert.ok(source.includes(command), command);
  }
});

test("merge policy is GitHub-native squash with zero approvals", () => {
  const policy = JSON.parse(readFileSync(".github/merge-policy.json", "utf8"));
  assert.equal(policy.merge_method, "squash");
  assert.equal(policy.required_approvals, 0);
  assert.deepEqual(policy.eligible_author_associations, ["OWNER", "MEMBER"]);
  assert.equal("eligible_author_logins" in policy, false);
  assert.equal(policy.custom_merge_controller, false);
  assert.ok(policy.required_checks.includes("Secret boundary"));
});
