import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createGitHubBoundary } from "../runtime/github.mjs";
import { createInitPreview, executeInit } from "../runtime/init.mjs";

const SOURCE = "openboa-ai/coffee-chat-roastery";
const TARGET = "example/coffee-chat";

function encoded(content) {
  return {
    encoding: "base64",
    content: Buffer.from(content).toString("base64"),
  };
}

test("preflight rejects a seed tree mismatch before any external write", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const writes = [];
  const transport = {
    async enableAutoMerge() {
      throw new Error("Auto-merge must not run during preflight");
    },
    async api({ method, path, allowNotFound = false }) {
      if (method !== "GET") writes.push(`${method} ${path}`);
      if (method === "GET" && path === "user") return { login: "example" };
      if (method === "GET" && path === `repos/${SOURCE}`) {
        return { private: false, default_branch: "main", full_name: SOURCE };
      }
      if (method === "GET" && path === `repos/${SOURCE}/git/ref/heads/main`) {
        return { object: { sha: preview.source.commit } };
      }
      if (
        method === "GET" &&
        path === `repos/${SOURCE}/git/commits/${preview.source.commit}`
      ) {
        return { tree: { sha: "0".repeat(40) } };
      }
      if (method === "GET" && path === `repos/${TARGET}` && allowNotFound) {
        return undefined;
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    },
  };
  const github = createGitHubBoundary({ transport });

  assert.deepEqual(await github.preflight(preview), {
    status: "failed",
    code: "stale_seed_tree",
  });
  assert.deepEqual(writes, []);
});

test("protection rejects an incomplete active ruleset", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const transport = {
    async enableAutoMerge() {
      throw new Error("Auto-merge must not run while protection is configured");
    },
    async api({ method, path, body }) {
      if (method === "PATCH" && path === `repos/${TARGET}`) return body;
      if (method === "PUT" && path === `repos/${TARGET}/actions/permissions`) {
        return body;
      }
      if (method === "GET" && path === `repos/${TARGET}/actions/permissions`) {
        return { enabled: true, allowed_actions: "all" };
      }
      if (method === "POST" && path === `repos/${TARGET}/rulesets`) {
        return { id: 1, name: body.name, enforcement: "active", rules: [] };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    },
  };
  const github = createGitHubBoundary({ transport });

  await assert.rejects(
    () => github.protect(preview),
    (error) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "protection_mismatch",
  );
});

test("the GitHub boundary forks only the frozen seed and verifies protected public main", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const writes = [];
  const blobs = new Map();
  const files = new Map();
  let forked = false;
  let protectedMain = false;
  let activeRuleset;
  let autoMergeEnabled = false;
  let merged = false;
  let blobSequence = 0;
  const head = "c".repeat(40);
  const mergeCommit = "d".repeat(40);
  let forkHead = "e".repeat(40);

  const transport = {
    async api({ method, path, body, allowNotFound = false }) {
      if (method === "GET" && path === "user") return { login: "Example" };
      if (method === "GET" && path === `repos/${SOURCE}`) {
        return { private: false, default_branch: "main", full_name: SOURCE };
      }
      if (method === "GET" && path === `repos/${SOURCE}/git/ref/heads/main`) {
        return { object: { sha: preview.source.commit } };
      }
      if (
        method === "GET" &&
        path === `repos/${SOURCE}/git/commits/${preview.source.commit}`
      ) {
        return { tree: { sha: preview.source.tree } };
      }
      if (method === "GET" && path === `repos/${TARGET}`) {
        if (!forked && allowNotFound) return undefined;
        return {
          private: false,
          fork: true,
          default_branch: "main",
          full_name: TARGET,
          parent: { full_name: SOURCE },
          allow_auto_merge: protectedMain,
          allow_squash_merge: true,
          allow_merge_commit: !protectedMain,
          allow_rebase_merge: !protectedMain,
          delete_branch_on_merge: protectedMain,
        };
      }
      if (method === "POST" && path === `repos/${SOURCE}/forks`) {
        writes.push("fork");
        assert.deepEqual(body, {
          name: "coffee-chat",
          default_branch_only: true,
        });
        forked = true;
        return { full_name: TARGET };
      }
      if (method === "GET" && path === `repos/${TARGET}/git/ref/heads/main`) {
        return {
          object: { sha: merged ? mergeCommit : forkHead },
        };
      }
      if (
        method === "PATCH" &&
        path === `repos/${TARGET}/git/refs/heads/main`
      ) {
        writes.push("anchor-seed");
        assert.deepEqual(body, { sha: preview.source.commit, force: true });
        forkHead = preview.source.commit;
        return { object: { sha: forkHead } };
      }
      if (method === "PATCH" && path === `repos/${TARGET}`) {
        writes.push("repository-settings");
        assert.equal(body.allow_auto_merge, true);
        assert.equal(body.allow_squash_merge, true);
        assert.equal(body.allow_merge_commit, false);
        assert.equal(body.allow_rebase_merge, false);
        return { full_name: TARGET, ...body };
      }
      if (method === "PUT" && path === `repos/${TARGET}/actions/permissions`) {
        writes.push("actions");
        assert.deepEqual(body, { enabled: true, allowed_actions: "all" });
        return {};
      }
      if (method === "GET" && path === `repos/${TARGET}/actions/permissions`) {
        return { enabled: true, allowed_actions: "all" };
      }
      if (method === "POST" && path === `repos/${TARGET}/rulesets`) {
        writes.push("ruleset");
        protectedMain = true;
        assert.equal(body.enforcement, "active");
        assert.deepEqual(body.bypass_actors, []);
        assert.deepEqual(
          body.rules
            .find(({ type }) => type === "required_status_checks")
            .parameters.required_status_checks.map(({ context }) => context),
          ["Roastery required", "Roastery dependency review"],
        );
        assert.ok(body.rules.some(({ type }) => type === "pull_request"));
        activeRuleset = { id: 1, ...body };
        return activeRuleset;
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/git/commits/${preview.source.commit}`
      ) {
        return { tree: { sha: preview.source.tree } };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/blobs`) {
        writes.push("blob");
        const sha = `blob-${(blobSequence += 1)}`;
        blobs.set(sha, body.content);
        return { sha };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/trees`) {
        writes.push("tree");
        assert.equal(body.base_tree, preview.source.tree);
        for (const entry of body.tree)
          files.set(entry.path, blobs.get(entry.sha));
        return { sha: "tree-initialized" };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/commits`) {
        writes.push("commit");
        assert.deepEqual(body.parents, [preview.source.commit]);
        assert.equal(body.tree, "tree-initialized");
        return { sha: head };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/refs`) {
        writes.push("ref");
        assert.equal(body.sha, head);
        assert.match(body.ref, /^refs\/heads\/init\//u);
        return { ref: body.ref };
      }
      if (method === "POST" && path === `repos/${TARGET}/pulls`) {
        writes.push("pull");
        assert.equal(body.base, "main");
        assert.match(body.head, /^init\//u);
        assert.match(body.body, new RegExp(preview.previewDigest, "u"));
        return { number: 17, head: { sha: head } };
      }
      if (method === "GET" && path === `repos/${TARGET}/pulls/17`) {
        return {
          number: 17,
          merged,
          state: merged ? "closed" : "open",
          merged_at: merged ? "2026-08-10T00:00:00Z" : null,
          merge_commit_sha: merged ? mergeCommit : null,
          head: { sha: head },
        };
      }
      if (method === "GET" && path === `repos/${TARGET}/rulesets`) {
        return protectedMain
          ? [
              {
                id: 1,
                name: "Standard Roastery main",
                enforcement: "active",
              },
            ]
          : [];
      }
      if (method === "GET" && path === `repos/${TARGET}/rulesets/1`) {
        return activeRuleset;
      }
      if (
        method === "GET" &&
        path.startsWith(`repos/${TARGET}/contents/roastery/`)
      ) {
        const name = path
          .slice(`repos/${TARGET}/contents/`.length)
          .split("?")[0];
        if (name === "roastery/beans" && allowNotFound) return undefined;
        if (name === "roastery/index.json") {
          return encoded('{\n  "beans": []\n}\n');
        }
        const content = files.get(name);
        if (content === undefined && allowNotFound) return undefined;
        return encoded(content);
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    },
    async enableAutoMerge({ repository, number, expectedHead }) {
      writes.push("auto-merge");
      assert.equal(repository, TARGET);
      assert.equal(number, 17);
      assert.equal(expectedHead, head);
      assert.equal(protectedMain, true);
      autoMergeEnabled = true;
    },
  };
  const github = createGitHubBoundary({
    transport,
    pause: async () => {
      assert.equal(autoMergeEnabled, true);
      merged = true;
    },
    attempts: 1,
  });
  const registry = {
    async preflightOwned() {
      return { status: "ready", repository: preview.target.repository };
    },
    async registerOwned(record) {
      writes.push("registry");
      return { status: "registered", record };
    },
  };
  const result = await executeInit({
    preview,
    acceptance: {
      decision: "accept",
      previewDigest: preview.previewDigest,
      rightsAttested: true,
    },
    github,
    registry,
  });

  assert.deepEqual(result, {
    status: "initialized",
    repository: preview.target.repository,
    commit: mergeCommit,
    pullRequest: 17,
  });
  assert.deepEqual(writes, [
    "fork",
    "anchor-seed",
    "repository-settings",
    "actions",
    "ruleset",
    "blob",
    "blob",
    "tree",
    "commit",
    "ref",
    "pull",
    "auto-merge",
    "registry",
  ]);
  assert.equal(
    createHash("sha256")
      .update(files.get("roastery/CONTENT_LICENSE.md"))
      .digest("hex"),
    preview.declaration.digest.slice("sha256:".length),
  );
});
