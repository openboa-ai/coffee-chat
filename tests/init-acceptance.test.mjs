import assert from "node:assert/strict";
import test from "node:test";

import { createInitPreview, executeInit, InitError } from "../runtime/init.mjs";

const OWNER = "example";
const ATTRIBUTION = "Example Owner";

function boundaries({ preflight = "ready", registryPreflight = "ready" } = {}) {
  const events = [];
  const writes = [];
  let proposedFiles;
  const github = {
    async preflight(preview) {
      events.push("preflight");
      return preflight === "ready"
        ? {
            status: "ready",
            owner: preview.target.owner,
            sourceCommit: preview.source.commit,
          }
        : { status: "failed", code: "github_preflight_failed" };
    },
    async fork(preview) {
      events.push("fork");
      writes.push("fork");
      return {
        status: "forked",
        repository: preview.target.repository,
        commit: preview.source.commit,
      };
    },
    async protect(preview) {
      events.push("protect");
      writes.push("protect");
      return { status: "protected", repository: preview.target.repository };
    },
    async propose({ preview, files }) {
      events.push("propose");
      writes.push("propose");
      proposedFiles = files;
      return {
        status: "proposed",
        repository: preview.target.repository,
        number: 17,
        head: "c".repeat(40),
      };
    },
    async awaitProtectedMerge(proposal) {
      events.push("await-protected-merge");
      return {
        status: "merged",
        repository: proposal.repository,
        number: proposal.number,
        commit: "d".repeat(40),
      };
    },
    async verifyOwned({ preview, merge }) {
      events.push("verify-owned");
      return {
        status: "verified",
        repository: preview.target.repository,
        commit: merge.commit,
      };
    },
  };
  const registry = {
    async preflightOwned(preview) {
      events.push("registry-preflight");
      return registryPreflight === "ready"
        ? { status: "ready", repository: preview.target.repository }
        : { status: "failed", code: "registry_preflight_failed" };
    },
    async registerOwned(record) {
      events.push("register-owned");
      writes.push("register-owned");
      return { status: "registered", record };
    },
  };
  return {
    events,
    github,
    registry,
    writes,
    proposedFiles: () => proposedFiles,
  };
}

test("Init Preview binds the exact public fork and fixed publication contract", () => {
  const preview = createInitPreview({ owner: OWNER, attribution: ATTRIBUTION });

  assert.equal(preview.status, "preview");
  assert.equal(
    preview.source.repository,
    "https://github.com/openboa-ai/coffee-chat-roastery",
  );
  assert.equal(
    preview.target.repository,
    "https://github.com/example/coffee-chat",
  );
  assert.equal(preview.target.visibility, "public");
  assert.equal(preview.target.defaultBranch, "main");
  assert.equal(preview.declaration.license, "CC-BY-4.0");
  assert.equal(preview.declaration.scope, "roastery/beans/**");
  assert.equal(preview.declaration.attribution, ATTRIBUTION);
  assert.match(preview.declaration.digest, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(
    preview.notices.map(({ id }) => id),
    [
      "public-beans",
      "sharing-commercial-ai-adaptation",
      "attribution-change-no-endorsement",
      "irrevocable",
      "rights-authority",
      "origin-exclusion",
      "ai-response-disclosure",
    ],
  );
  assert.equal(preview.publication.branchPullRequestOnly, true);
  assert.equal(preview.publication.requiredCi, true);
  assert.equal(preview.publication.squashMerge, true);
  assert.equal(
    preview.localState.registryWrite,
    "after-public-main-verification",
  );
  assert.match(preview.previewDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(
    createInitPreview({ owner: OWNER, attribution: ATTRIBUTION }),
    preview,
  );
});

test("accepted Init publishes only approved identity bytes and registers after verification", async () => {
  const preview = createInitPreview({ owner: OWNER, attribution: ATTRIBUTION });
  const boundary = boundaries();
  const result = await executeInit({
    preview,
    acceptance: {
      decision: "accept",
      previewDigest: preview.previewDigest,
      rightsAttested: true,
    },
    github: boundary.github,
    registry: boundary.registry,
  });

  assert.deepEqual(boundary.events, [
    "registry-preflight",
    "preflight",
    "fork",
    "protect",
    "propose",
    "await-protected-merge",
    "verify-owned",
    "register-owned",
  ]);
  assert.deepEqual(boundary.writes, [
    "fork",
    "protect",
    "propose",
    "register-owned",
  ]);
  assert.deepEqual(Object.keys(boundary.proposedFiles()).sort(), [
    "roastery/CONTENT_LICENSE.md",
    "roastery/roastery.json",
  ]);
  assert.equal(
    boundary.proposedFiles()["roastery/CONTENT_LICENSE.md"],
    preview.declaration.content,
  );
  assert.deepEqual(
    JSON.parse(boundary.proposedFiles()["roastery/roastery.json"]),
    {
      repository: preview.target.repository,
      contract: preview.contract,
    },
  );
  assert.deepEqual(result, {
    status: "initialized",
    repository: preview.target.repository,
    commit: "d".repeat(40),
    pullRequest: 17,
  });
});

test("refusal, cancellation, invalid input, stale Preview, and failed preflight preserve zero writes", async () => {
  const preview = createInitPreview({ owner: OWNER, attribution: ATTRIBUTION });
  for (const [acceptance, status] of [
    [{ decision: "reject", previewDigest: preview.previewDigest }, "rejected"],
    [{ decision: "cancel", previewDigest: preview.previewDigest }, "cancelled"],
    [
      {
        decision: "accept",
        previewDigest: `sha256:${"0".repeat(64)}`,
        rightsAttested: true,
      },
      "stale_preview",
    ],
    [
      {
        decision: "accept",
        previewDigest: preview.previewDigest,
        rightsAttested: false,
      },
      "rights_not_attested",
    ],
  ]) {
    const boundary = boundaries();
    assert.deepEqual(
      await executeInit({
        preview,
        acceptance,
        github: boundary.github,
        registry: boundary.registry,
      }),
      { status },
    );
    assert.deepEqual(boundary.events, []);
    assert.deepEqual(boundary.writes, []);
  }

  for (const input of [
    { owner: OWNER, attribution: "" },
    { owner: "not/an/owner", attribution: ATTRIBUTION },
    { owner: OWNER, attribution: ATTRIBUTION, license: "CC0-1.0" },
  ]) {
    assert.throws(
      () => createInitPreview(input),
      (error) => error instanceof InitError,
    );
  }

  for (const { boundary, code, events } of [
    {
      boundary: boundaries({ registryPreflight: "failed" }),
      code: "registry_preflight_failed",
      events: ["registry-preflight"],
    },
    {
      boundary: boundaries({ preflight: "failed" }),
      code: "github_preflight_failed",
      events: ["registry-preflight", "preflight"],
    },
  ]) {
    assert.deepEqual(
      await executeInit({
        preview,
        acceptance: {
          decision: "accept",
          previewDigest: preview.previewDigest,
          rightsAttested: true,
        },
        github: boundary.github,
        registry: boundary.registry,
      }),
      { status: "preflight_failed", code },
    );
    assert.deepEqual(boundary.events, events);
    assert.deepEqual(boundary.writes, []);
  }
});
