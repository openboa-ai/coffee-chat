import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createGitHubBoundary } from "../runtime/github.mjs";
import { createInitPreview, executeInit } from "../runtime/init.mjs";

const SOURCE = "openboa-ai/coffee-chat-roastery";
const TARGET = "example/coffee-chat";
const OWNER_CODEOWNERS = `/.github/ @example
/AGENTS.md @example
/CODEOWNERS @example
/SECURITY.md @example
/src/ @example
/dist/ @example
/scripts/ @example
/runtime/ @example
/contract/ @example
/package.json @example
/package-lock.json @example
/tsconfig.json @example
/tsconfig.build.json @example
`;

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

test("protection rejects an incomplete selected-actions allowlist", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const defaultBranchWrites = [];
  const transport = {
    async enableAutoMerge() {
      throw new Error("Auto-merge must not run while protection is configured");
    },
    async api({ method, path, body }) {
      if (
        method === "GET" &&
        path === `repos/${TARGET}/git/commits/${preview.source.commit}`
      ) {
        return { tree: { sha: preview.source.tree } };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/blobs`) {
        return { sha: "codeowners-blob" };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/trees`) {
        return { sha: "codeowners-tree" };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/commits`) {
        return { sha: "codeowners-commit" };
      }
      if (
        method === "PATCH" &&
        path === `repos/${TARGET}/git/refs/heads/main`
      ) {
        defaultBranchWrites.push(body);
        return { object: { sha: "codeowners-commit" } };
      }
      if (method === "GET" && path === `repos/${TARGET}/git/ref/heads/main`) {
        return { object: { sha: "codeowners-commit" } };
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/contents/CODEOWNERS?ref=codeowners-commit`
      ) {
        return encoded(OWNER_CODEOWNERS);
      }
      if (method === "PATCH" && path === `repos/${TARGET}`) return body;
      if (method === "PUT" && path === `repos/${TARGET}/actions/permissions`) {
        return body;
      }
      if (method === "GET" && path === `repos/${TARGET}/actions/permissions`) {
        return {
          enabled: true,
          allowed_actions: "selected",
          sha_pinning_required: true,
        };
      }
      if (
        method === "PUT" &&
        path === `repos/${TARGET}/actions/permissions/selected-actions`
      ) {
        return body;
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/actions/permissions/selected-actions`
      ) {
        return {
          github_owned_allowed: false,
          verified_allowed: false,
          patterns_allowed: [],
        };
      }
      if (
        method === "PUT" &&
        path === `repos/${TARGET}/actions/permissions/workflow`
      ) {
        return body;
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/actions/permissions/workflow`
      ) {
        return {
          default_workflow_permissions: "read",
          can_approve_pull_request_reviews: false,
        };
      }
      if (method === "POST" && path === `repos/${TARGET}/rulesets`) {
        return { id: 1, ...body };
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
  assert.deepEqual(defaultBranchWrites, []);
});

test("protection rejects a generated-fork ruleset that requires impossible self-review", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const transport = {
    async enableAutoMerge() {
      throw new Error("Auto-merge must not run while protection is configured");
    },
    async api({ method, path, body }) {
      if (
        method === "GET" &&
        path === `repos/${TARGET}/git/commits/${preview.source.commit}`
      ) {
        return { tree: { sha: preview.source.tree } };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/blobs`) {
        assert.equal(body.content, OWNER_CODEOWNERS);
        return { sha: "codeowners-blob" };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/trees`) {
        assert.deepEqual(body, {
          base_tree: preview.source.tree,
          tree: [
            {
              path: "CODEOWNERS",
              mode: "100644",
              type: "blob",
              sha: "codeowners-blob",
            },
          ],
        });
        return { sha: "codeowners-tree" };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/commits`) {
        assert.deepEqual(body, {
          message: "Protect Coffee Chat owner controls",
          tree: "codeowners-tree",
          parents: [preview.source.commit],
        });
        return { sha: "codeowners-commit" };
      }
      if (
        method === "PATCH" &&
        path === `repos/${TARGET}/git/refs/heads/main`
      ) {
        assert.deepEqual(body, { sha: "codeowners-commit", force: false });
        return { object: { sha: "codeowners-commit" } };
      }
      if (method === "GET" && path === `repos/${TARGET}/git/ref/heads/main`) {
        return { object: { sha: "codeowners-commit" } };
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/contents/CODEOWNERS?ref=codeowners-commit`
      ) {
        return encoded(OWNER_CODEOWNERS);
      }
      if (method === "PATCH" && path === `repos/${TARGET}`) return body;
      if (method === "PUT" && path === `repos/${TARGET}/actions/permissions`) {
        assert.deepEqual(body, {
          enabled: true,
          allowed_actions: "selected",
          sha_pinning_required: true,
        });
        return body;
      }
      if (method === "GET" && path === `repos/${TARGET}/actions/permissions`) {
        return {
          enabled: true,
          allowed_actions: "selected",
          sha_pinning_required: true,
        };
      }
      if (
        method === "PUT" &&
        path === `repos/${TARGET}/actions/permissions/selected-actions`
      ) {
        assert.deepEqual(body, {
          github_owned_allowed: true,
          verified_allowed: false,
          patterns_allowed: [],
        });
        return body;
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/actions/permissions/selected-actions`
      ) {
        return {
          github_owned_allowed: true,
          verified_allowed: false,
          patterns_allowed: [],
        };
      }
      if (
        method === "PUT" &&
        path === `repos/${TARGET}/actions/permissions/workflow`
      ) {
        assert.deepEqual(body, {
          default_workflow_permissions: "read",
          can_approve_pull_request_reviews: false,
        });
        return body;
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/actions/permissions/workflow`
      ) {
        return {
          default_workflow_permissions: "read",
          can_approve_pull_request_reviews: false,
        };
      }
      if (method === "POST" && path === `repos/${TARGET}/rulesets`) {
        const pullRequest = body.rules.find(
          ({ type }) => type === "pull_request",
        );
        return {
          id: 1,
          ...body,
          rules: body.rules.map((rule) =>
            rule === pullRequest
              ? {
                  ...rule,
                  parameters: {
                    ...rule.parameters,
                    require_code_owner_review: true,
                  },
                }
              : rule,
          ),
        };
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

test("fork rejects a stale snapshot without mutating the default branch", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const defaultBranchWrites = [];
  let forked = false;
  const transport = {
    async enableAutoMerge() {
      throw new Error("Auto-merge must not run while the fork is verified");
    },
    async api({ method, path, body, allowNotFound = false }) {
      if (method === "POST" && path === `repos/${SOURCE}/forks`) {
        forked = true;
        return { full_name: TARGET };
      }
      if (method === "GET" && path === `repos/${TARGET}`) {
        if (!forked && allowNotFound) return undefined;
        return {
          private: false,
          fork: true,
          default_branch: "main",
          full_name: TARGET,
          parent: { full_name: SOURCE },
        };
      }
      if (method === "GET" && path === `repos/${TARGET}/git/ref/heads/main`) {
        return { object: { sha: "f".repeat(40) } };
      }
      if (
        method === "PATCH" &&
        path === `repos/${TARGET}/git/refs/heads/main`
      ) {
        defaultBranchWrites.push(body);
        return { object: { sha: preview.source.commit } };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    },
  };
  const github = createGitHubBoundary({
    transport,
    pause: async () => {},
    attempts: 1,
  });

  await assert.rejects(
    () => github.fork(preview),
    (error) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "fork_seed_mismatch",
  );
  assert.deepEqual(defaultBranchWrites, []);
});

test("protection rejects each missing trusted boundary context", async () => {
  for (const missingContext of [
    "Secret boundary",
    "Roastery CodeQL JavaScript-TypeScript",
  ]) {
    const preview = createInitPreview({
      owner: "example",
      attribution: "Example Owner",
    });
    const transport = {
      async enableAutoMerge() {
        throw new Error(
          "Auto-merge must not run while protection is configured",
        );
      },
      async api({ method, path, body }) {
        if (
          method === "GET" &&
          path === `repos/${TARGET}/git/commits/${preview.source.commit}`
        ) {
          return { tree: { sha: preview.source.tree } };
        }
        if (method === "POST" && path === `repos/${TARGET}/git/blobs`) {
          return { sha: "codeowners-blob" };
        }
        if (method === "POST" && path === `repos/${TARGET}/git/trees`) {
          return { sha: "codeowners-tree" };
        }
        if (method === "POST" && path === `repos/${TARGET}/git/commits`) {
          return { sha: "codeowners-commit" };
        }
        if (
          method === "PATCH" &&
          path === `repos/${TARGET}/git/refs/heads/main`
        ) {
          return { object: { sha: "codeowners-commit" } };
        }
        if (method === "GET" && path === `repos/${TARGET}/git/ref/heads/main`) {
          return { object: { sha: "codeowners-commit" } };
        }
        if (
          method === "GET" &&
          path === `repos/${TARGET}/contents/CODEOWNERS?ref=codeowners-commit`
        ) {
          return encoded(OWNER_CODEOWNERS);
        }
        if (method === "PATCH" && path === `repos/${TARGET}`) return body;
        if (
          method === "PUT" &&
          path === `repos/${TARGET}/actions/permissions`
        ) {
          return body;
        }
        if (
          method === "GET" &&
          path === `repos/${TARGET}/actions/permissions`
        ) {
          return {
            enabled: true,
            allowed_actions: "selected",
            sha_pinning_required: true,
          };
        }
        if (
          method === "PUT" &&
          path === `repos/${TARGET}/actions/permissions/selected-actions`
        ) {
          return body;
        }
        if (
          method === "GET" &&
          path === `repos/${TARGET}/actions/permissions/selected-actions`
        ) {
          return {
            github_owned_allowed: true,
            verified_allowed: false,
            patterns_allowed: [],
          };
        }
        if (
          method === "PUT" &&
          path === `repos/${TARGET}/actions/permissions/workflow`
        ) {
          return body;
        }
        if (
          method === "GET" &&
          path === `repos/${TARGET}/actions/permissions/workflow`
        ) {
          return {
            default_workflow_permissions: "read",
            can_approve_pull_request_reviews: false,
          };
        }
        if (method === "POST" && path === `repos/${TARGET}/rulesets`) {
          return {
            id: 1,
            ...body,
            rules: body.rules.map((rule) =>
              rule.type === "required_status_checks"
                ? {
                    ...rule,
                    parameters: {
                      ...rule.parameters,
                      required_status_checks:
                        rule.parameters.required_status_checks.filter(
                          ({ context }) => context !== missingContext,
                        ),
                    },
                  }
                : rule,
            ),
          };
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
  }
});

test("the GitHub boundary forks only the frozen seed and verifies protected public main", async () => {
  const preview = createInitPreview({
    owner: "example",
    attribution: "Example Owner",
  });
  const writes = [];
  const blobs = new Map();
  const proposalFiles = new Map();
  let forked = false;
  let protectedMain = false;
  let activeRuleset;
  let autoMergeEnabled = false;
  let merged = false;
  let blobSequence = 0;
  const head = "c".repeat(40);
  const mergeCommit = "d".repeat(40);
  const forkHead = preview.source.commit;

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
        assert.fail(
          `Default branch mutation is forbidden: ${JSON.stringify(body)}`,
        );
      }
      if (method === "PATCH" && path === `repos/${TARGET}`) {
        writes.push("repository-settings");
        assert.equal(body.allow_auto_merge, true);
        assert.equal(body.allow_squash_merge, true);
        assert.equal(body.allow_merge_commit, false);
        assert.equal(body.allow_rebase_merge, false);
        return { full_name: TARGET, ...body };
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
        assert.deepEqual(body.tree.map(({ path }) => path).sort(), [
          "CODEOWNERS",
          "roastery/CONTENT_LICENSE.md",
          "roastery/roastery.json",
        ]);
        for (const entry of body.tree) {
          proposalFiles.set(entry.path, blobs.get(entry.sha));
        }
        return { sha: "tree-initialized" };
      }
      if (method === "POST" && path === `repos/${TARGET}/git/commits`) {
        writes.push("commit");
        assert.deepEqual(body.parents, [preview.source.commit]);
        assert.equal(body.tree, "tree-initialized");
        return { sha: head };
      }
      if (method === "PUT" && path === `repos/${TARGET}/actions/permissions`) {
        writes.push("actions");
        assert.deepEqual(body, {
          enabled: true,
          allowed_actions: "selected",
          sha_pinning_required: true,
        });
        return {};
      }
      if (method === "GET" && path === `repos/${TARGET}/actions/permissions`) {
        return {
          enabled: true,
          allowed_actions: "selected",
          sha_pinning_required: true,
        };
      }
      if (
        method === "PUT" &&
        path === `repos/${TARGET}/actions/permissions/selected-actions`
      ) {
        writes.push("selected-actions");
        assert.deepEqual(body, {
          github_owned_allowed: true,
          verified_allowed: false,
          patterns_allowed: [],
        });
        return {};
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/actions/permissions/selected-actions`
      ) {
        return {
          github_owned_allowed: true,
          verified_allowed: false,
          patterns_allowed: [],
        };
      }
      if (
        method === "PUT" &&
        path === `repos/${TARGET}/actions/permissions/workflow`
      ) {
        writes.push("workflow-permissions");
        assert.deepEqual(body, {
          default_workflow_permissions: "read",
          can_approve_pull_request_reviews: false,
        });
        return {};
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/actions/permissions/workflow`
      ) {
        return {
          default_workflow_permissions: "read",
          can_approve_pull_request_reviews: false,
        };
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
          [
            "Roastery required",
            "Roastery dependency review",
            "Secret boundary",
            "Roastery CodeQL JavaScript-TypeScript",
          ],
        );
        assert.deepEqual(
          body.rules.find(({ type }) => type === "pull_request").parameters,
          {
            allowed_merge_methods: ["squash"],
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_approving_review_count: 0,
            required_review_thread_resolution: true,
          },
        );
        activeRuleset = { id: 1, ...body };
        return activeRuleset;
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/git/commits/${preview.source.commit}`
      ) {
        return { tree: { sha: preview.source.tree } };
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
        assert.deepEqual([...proposalFiles.keys()].sort(), [
          "CODEOWNERS",
          "roastery/CONTENT_LICENSE.md",
          "roastery/roastery.json",
        ]);
        assert.equal(proposalFiles.get("CODEOWNERS"), OWNER_CODEOWNERS);
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
        const content = proposalFiles.get(name);
        if (content === undefined && allowNotFound) return undefined;
        return encoded(content);
      }
      if (
        method === "GET" &&
        path === `repos/${TARGET}/contents/CODEOWNERS?ref=${mergeCommit}`
      ) {
        return encoded(OWNER_CODEOWNERS);
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
    "repository-settings",
    "actions",
    "selected-actions",
    "workflow-permissions",
    "ruleset",
    "blob",
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
      .update(proposalFiles.get("roastery/CONTENT_LICENSE.md"))
      .digest("hex"),
    preview.declaration.digest.slice("sha256:".length),
  );
  assert.deepEqual(
    OWNER_CODEOWNERS.trim()
      .split("\n")
      .map((line) => line.split(" ")[0]),
    [
      "/.github/",
      "/AGENTS.md",
      "/CODEOWNERS",
      "/SECURITY.md",
      "/src/",
      "/dist/",
      "/scripts/",
      "/runtime/",
      "/contract/",
      "/package.json",
      "/package-lock.json",
      "/tsconfig.json",
      "/tsconfig.build.json",
    ],
  );
  for (const normalRoasteryPath of [
    "/roastery/CONTENT_LICENSE.md",
    "/roastery/roastery.json",
    "/roastery/beans/**",
  ]) {
    assert.equal(OWNER_CODEOWNERS.includes(normalRoasteryPath), false);
  }
});
