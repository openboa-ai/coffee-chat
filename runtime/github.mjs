import { execFileSync } from "node:child_process";

import { parseContentLicense } from "../contract/roastery/dist/content-license.js";

const SOURCE = "openboa-ai/coffee-chat-roastery";
const REQUIRED_CHECKS = Object.freeze([
  "Roastery required",
  "Roastery dependency review",
  "Secret boundary",
  "Roastery CodeQL JavaScript-TypeScript",
]);

function ownerCodeowners(owner) {
  return `/.github/ @${owner}
/AGENTS.md @${owner}
/CODEOWNERS @${owner}
/SECURITY.md @${owner}
/src/ @${owner}
/dist/ @${owner}
/scripts/ @${owner}
/runtime/ @${owner}
/contract/ @${owner}
/package.json @${owner}
/package-lock.json @${owner}
/tsconfig.json @${owner}
/tsconfig.build.json @${owner}
`;
}

/**
 * @typedef {object} GitHubApiRequest
 * @property {string} method
 * @property {string} path
 * @property {unknown} [body]
 * @property {boolean} [allowNotFound]
 */

export class GitHubBoundaryError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "GitHubBoundaryError";
    this.code = code;
  }
}

function repositorySlug(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new GitHubBoundaryError("invalid_repository");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.search ||
    parsed.hash ||
    parts.length !== 2
  ) {
    throw new GitHubBoundaryError("invalid_repository");
  }
  return `${parts[0]}/${parts[1]}`;
}

function ruleset() {
  return {
    name: "Standard Roastery main",
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: {
      ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
    },
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "required_linear_history" },
      {
        type: "pull_request",
        parameters: {
          allowed_merge_methods: ["squash"],
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: true,
          require_last_push_approval: false,
          required_approving_review_count: 0,
          required_review_thread_resolution: true,
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          do_not_enforce_on_create: false,
          strict_required_status_checks_policy: true,
          required_status_checks: REQUIRED_CHECKS.map((context) => ({
            context,
            integration_id: 15368,
          })),
        },
      },
      {
        type: "code_scanning",
        parameters: {
          code_scanning_tools: [
            {
              tool: "CodeQL",
              alerts_threshold: "errors",
              security_alerts_threshold: "high_or_higher",
            },
          ],
        },
      },
    ],
  };
}

function protectedRuleset(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !Number.isInteger(value.id) ||
    value.name !== "Standard Roastery main" ||
    value.target !== "branch" ||
    value.enforcement !== "active" ||
    !Array.isArray(value.bypass_actors) ||
    value.bypass_actors.length !== 0 ||
    !value.conditions ||
    !Array.isArray(value.conditions.ref_name?.include) ||
    !value.conditions.ref_name.include.includes("~DEFAULT_BRANCH") ||
    !Array.isArray(value.conditions.ref_name?.exclude) ||
    value.conditions.ref_name.exclude.length !== 0 ||
    !Array.isArray(value.rules)
  ) {
    return false;
  }
  const byType = new Map(value.rules.map((rule) => [rule.type, rule]));
  for (const type of [
    "deletion",
    "non_fast_forward",
    "required_linear_history",
  ]) {
    if (!byType.has(type)) return false;
  }
  const pull = byType.get("pull_request")?.parameters;
  if (
    !pull ||
    JSON.stringify(pull.allowed_merge_methods) !== JSON.stringify(["squash"]) ||
    pull.dismiss_stale_reviews_on_push !== true ||
    pull.require_code_owner_review !== true ||
    pull.require_last_push_approval !== false ||
    pull.required_approving_review_count !== 0 ||
    pull.required_review_thread_resolution !== true
  ) {
    return false;
  }
  const statuses = byType.get("required_status_checks")?.parameters;
  if (
    !statuses ||
    statuses.strict_required_status_checks_policy !== true ||
    JSON.stringify(
      (statuses.required_status_checks ?? [])
        .map(({ context, integration_id }) => ({ context, integration_id }))
        .sort((left, right) => left.context.localeCompare(right.context)),
    ) !==
      JSON.stringify(
        REQUIRED_CHECKS.map((context) => ({
          context,
          integration_id: 15368,
        })).sort((left, right) => left.context.localeCompare(right.context)),
      )
  ) {
    return false;
  }
  const scanning = byType.get("code_scanning")?.parameters;
  return (scanning?.code_scanning_tools ?? []).some(
    (tool) =>
      tool.tool === "CodeQL" &&
      tool.alerts_threshold === "errors" &&
      tool.security_alerts_threshold === "high_or_higher",
  );
}

function protectedRepository(value) {
  return (
    value?.allow_auto_merge === true &&
    value?.allow_squash_merge === true &&
    value?.allow_merge_commit === false &&
    value?.allow_rebase_merge === false &&
    value?.delete_branch_on_merge === true
  );
}

function protectedActions(value) {
  return (
    value?.enabled === true &&
    value?.allowed_actions === "selected" &&
    value?.sha_pinning_required === true
  );
}

function protectedSelectedActions(value) {
  return (
    value?.github_owned_allowed === true &&
    value?.verified_allowed === false &&
    Array.isArray(value?.patterns_allowed) &&
    value.patterns_allowed.length === 0
  );
}

function protectedWorkflowPermissions(value) {
  return (
    value?.default_workflow_permissions === "read" &&
    value?.can_approve_pull_request_reviews === false
  );
}

async function poll({ attempts, pause, read, accept, code }) {
  let attempt = 0;
  while (attempts === undefined || attempt < attempts) {
    const value = await read();
    if (accept(value)) return value;
    attempt += 1;
    if (attempts === undefined || attempt < attempts) await pause();
  }
  throw new GitHubBoundaryError(code);
}

function decodeFile(response, code) {
  if (
    !response ||
    response.encoding !== "base64" ||
    typeof response.content !== "string"
  ) {
    throw new GitHubBoundaryError(code);
  }
  return Buffer.from(response.content.replace(/\s/gu, ""), "base64").toString(
    "utf8",
  );
}

function exactFiles(files) {
  if (
    !files ||
    JSON.stringify(Object.keys(files).sort()) !==
      JSON.stringify([
        "roastery/CONTENT_LICENSE.md",
        "roastery/roastery.json",
      ]) ||
    Object.values(files).some((content) => typeof content !== "string")
  ) {
    throw new GitHubBoundaryError("invalid_initialization_files");
  }
}

export function createGitHubBoundary({
  transport = createGhTransport(),
  pause = () => new Promise((resolve) => setTimeout(resolve, 2_000)),
  attempts = 90,
  mergeAttempts = undefined,
} = {}) {
  const protectedBases = new Map();

  return {
    async preflight(preview) {
      try {
        const target = repositorySlug(preview.target.repository);
        const viewer = await transport.api({ method: "GET", path: "user" });
        if (
          typeof viewer?.login !== "string" ||
          viewer.login.toLowerCase() !== preview.target.owner
        ) {
          return { status: "failed", code: "github_owner_mismatch" };
        }
        const source = await transport.api({
          method: "GET",
          path: `repos/${SOURCE}`,
        });
        if (
          source?.full_name !== SOURCE ||
          source.private !== false ||
          source.default_branch !== preview.source.defaultBranch
        ) {
          return { status: "failed", code: "invalid_seed_repository" };
        }
        const reference = await transport.api({
          method: "GET",
          path: `repos/${SOURCE}/git/ref/heads/${preview.source.defaultBranch}`,
        });
        if (reference?.object?.sha !== preview.source.commit) {
          return { status: "failed", code: "stale_seed" };
        }
        const sourceCommit = await transport.api({
          method: "GET",
          path: `repos/${SOURCE}/git/commits/${preview.source.commit}`,
        });
        if (sourceCommit?.tree?.sha !== preview.source.tree) {
          return { status: "failed", code: "stale_seed_tree" };
        }
        const existing = await transport.api({
          method: "GET",
          path: `repos/${target}`,
          allowNotFound: true,
        });
        if (existing !== undefined) {
          return { status: "failed", code: "target_repository_exists" };
        }
        return {
          status: "ready",
          owner: preview.target.owner,
          sourceCommit: preview.source.commit,
        };
      } catch (error) {
        return {
          status: "failed",
          code:
            error instanceof GitHubBoundaryError
              ? error.code
              : "github_preflight_failed",
        };
      }
    },

    async fork(preview) {
      const target = repositorySlug(preview.target.repository);
      await transport.api({
        method: "POST",
        path: `repos/${SOURCE}/forks`,
        body: {
          name: preview.target.name,
          default_branch_only: true,
        },
      });
      const repository = await poll({
        attempts,
        pause,
        code: "fork_not_ready",
        read: () =>
          transport.api({
            method: "GET",
            path: `repos/${target}`,
            allowNotFound: true,
          }),
        accept: (value) =>
          value?.full_name?.toLowerCase() === target &&
          value.private === false &&
          value.fork === true &&
          value.parent?.full_name === SOURCE &&
          value.default_branch === preview.source.defaultBranch,
      });
      if (!repository) throw new GitHubBoundaryError("fork_mismatch");
      await poll({
        attempts,
        pause,
        code: "fork_ref_not_ready",
        read: () =>
          transport.api({
            method: "GET",
            path: `repos/${target}/git/ref/heads/${preview.source.defaultBranch}`,
            allowNotFound: true,
          }),
        accept: (value) => typeof value?.object?.sha === "string",
      });
      await transport.api({
        method: "PATCH",
        path: `repos/${target}/git/refs/heads/${preview.source.defaultBranch}`,
        body: { sha: preview.source.commit, force: true },
      });
      const reference = await poll({
        attempts,
        pause,
        code: "fork_seed_mismatch",
        read: () =>
          transport.api({
            method: "GET",
            path: `repos/${target}/git/ref/heads/${preview.source.defaultBranch}`,
            allowNotFound: true,
          }),
        accept: (value) => value?.object?.sha === preview.source.commit,
      });
      const commit = await transport.api({
        method: "GET",
        path: `repos/${target}/git/commits/${preview.source.commit}`,
      });
      if (commit?.tree?.sha !== preview.source.tree) {
        throw new GitHubBoundaryError("fork_seed_tree_mismatch");
      }
      return {
        status: "forked",
        repository: preview.target.repository,
        commit: reference.object.sha,
      };
    },

    async protect(preview) {
      const target = repositorySlug(preview.target.repository);
      const repository = await transport.api({
        method: "PATCH",
        path: `repos/${target}`,
        body: {
          allow_auto_merge: true,
          allow_squash_merge: true,
          allow_merge_commit: false,
          allow_rebase_merge: false,
          delete_branch_on_merge: true,
        },
      });
      await transport.api({
        method: "PUT",
        path: `repos/${target}/actions/permissions`,
        body: {
          enabled: true,
          allowed_actions: "selected",
          sha_pinning_required: true,
        },
      });
      await transport.api({
        method: "PUT",
        path: `repos/${target}/actions/permissions/selected-actions`,
        body: {
          github_owned_allowed: true,
          verified_allowed: false,
          patterns_allowed: [],
        },
      });
      await transport.api({
        method: "PUT",
        path: `repos/${target}/actions/permissions/workflow`,
        body: {
          default_workflow_permissions: "read",
          can_approve_pull_request_reviews: false,
        },
      });
      const [actionPermissions, selectedActions, workflowPermissions] =
        await Promise.all([
          transport.api({
            method: "GET",
            path: `repos/${target}/actions/permissions`,
          }),
          transport.api({
            method: "GET",
            path: `repos/${target}/actions/permissions/selected-actions`,
          }),
          transport.api({
            method: "GET",
            path: `repos/${target}/actions/permissions/workflow`,
          }),
        ]);
      const createdRuleset = await transport.api({
        method: "POST",
        path: `repos/${target}/rulesets`,
        body: ruleset(),
      });
      if (
        !protectedRepository(repository) ||
        !protectedActions(actionPermissions) ||
        !protectedSelectedActions(selectedActions) ||
        !protectedWorkflowPermissions(workflowPermissions) ||
        !protectedRuleset(createdRuleset)
      ) {
        throw new GitHubBoundaryError("protection_mismatch");
      }
      protectedBases.set(target, {
        commit: preview.source.commit,
        tree: preview.source.tree,
      });
      return {
        status: "protected",
        repository: preview.target.repository,
        ruleset: createdRuleset.id,
      };
    },

    async propose({ preview, acceptance, files }) {
      exactFiles(files);
      const target = repositorySlug(preview.target.repository);
      const protectedBase = protectedBases.get(target);
      if (!protectedBase) {
        throw new GitHubBoundaryError("protected_base_mismatch");
      }
      const reference = await transport.api({
        method: "GET",
        path: `repos/${target}/git/ref/heads/${preview.target.defaultBranch}`,
      });
      if (reference?.object?.sha !== protectedBase.commit) {
        throw new GitHubBoundaryError("protected_base_mismatch");
      }
      const base = await transport.api({
        method: "GET",
        path: `repos/${target}/git/commits/${protectedBase.commit}`,
      });
      if (base?.tree?.sha !== protectedBase.tree) {
        throw new GitHubBoundaryError("protected_base_mismatch");
      }
      const entries = [];
      const proposedFiles = {
        CODEOWNERS: ownerCodeowners(preview.target.owner),
        ...files,
      };
      for (const path of Object.keys(proposedFiles).sort()) {
        const blob = await transport.api({
          method: "POST",
          path: `repos/${target}/git/blobs`,
          body: { content: proposedFiles[path], encoding: "utf-8" },
        });
        if (typeof blob?.sha !== "string") {
          throw new GitHubBoundaryError("blob_creation_failed");
        }
        entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }
      const tree = await transport.api({
        method: "POST",
        path: `repos/${target}/git/trees`,
        body: { base_tree: protectedBase.tree, tree: entries },
      });
      const commit = await transport.api({
        method: "POST",
        path: `repos/${target}/git/commits`,
        body: {
          message: `Initialize Coffee Chat Roastery\n\nPreview: ${preview.previewDigest}`,
          tree: tree.sha,
          parents: [protectedBase.commit],
        },
      });
      if (typeof commit?.sha !== "string") {
        throw new GitHubBoundaryError("commit_creation_failed");
      }
      const branch = `init/${preview.previewDigest.slice("sha256:".length, 19)}`;
      await transport.api({
        method: "POST",
        path: `repos/${target}/git/refs`,
        body: { ref: `refs/heads/${branch}`, sha: commit.sha },
      });
      const pull = await transport.api({
        method: "POST",
        path: `repos/${target}/pulls`,
        body: {
          title: "Initialize my Coffee Chat Roastery",
          head: branch,
          base: preview.target.defaultBranch,
          body: [
            "Initialize this public fork from the immutable Standard Roastery seed.",
            "",
            `Preview: \`${preview.previewDigest}\``,
            `Declaration: \`${preview.declaration.digest}\``,
            `Rights attested: \`${acceptance.rightsAttested === true}\``,
          ].join("\n"),
        },
      });
      if (typeof pull?.number !== "number" || pull.head?.sha !== commit.sha) {
        throw new GitHubBoundaryError("pull_request_mismatch");
      }
      return {
        status: "proposed",
        repository: preview.target.repository,
        number: pull.number,
        head: commit.sha,
      };
    },

    async awaitProtectedMerge(proposal) {
      const target = repositorySlug(proposal.repository);
      const current = await transport.api({
        method: "GET",
        path: `repos/${target}/pulls/${proposal.number}`,
      });
      if (current?.head?.sha !== proposal.head) {
        throw new GitHubBoundaryError("stale_proposal");
      }
      await transport.enableAutoMerge({
        repository: target,
        number: proposal.number,
        expectedHead: proposal.head,
      });
      const merged = await poll({
        attempts: mergeAttempts,
        pause,
        code: "protected_merge_timeout",
        read: () =>
          transport.api({
            method: "GET",
            path: `repos/${target}/pulls/${proposal.number}`,
          }),
        accept: (value) => {
          if (value?.head?.sha !== proposal.head) {
            throw new GitHubBoundaryError("stale_proposal");
          }
          if (value?.state === "closed" && value.merged !== true) {
            throw new GitHubBoundaryError("protected_merge_closed");
          }
          return (
            value.merged === true &&
            typeof value.merged_at === "string" &&
            typeof value.merge_commit_sha === "string"
          );
        },
      });
      return {
        status: "merged",
        repository: proposal.repository,
        number: proposal.number,
        commit: merged.merge_commit_sha,
      };
    },

    async verifyOwned({ preview, merge }) {
      const target = repositorySlug(preview.target.repository);
      const [
        repository,
        reference,
        activeRulesets,
        actionPermissions,
        selectedActions,
        workflowPermissions,
      ] = await Promise.all([
        transport.api({ method: "GET", path: `repos/${target}` }),
        transport.api({
          method: "GET",
          path: `repos/${target}/git/ref/heads/${preview.target.defaultBranch}`,
        }),
        transport.api({ method: "GET", path: `repos/${target}/rulesets` }),
        transport.api({
          method: "GET",
          path: `repos/${target}/actions/permissions`,
        }),
        transport.api({
          method: "GET",
          path: `repos/${target}/actions/permissions/selected-actions`,
        }),
        transport.api({
          method: "GET",
          path: `repos/${target}/actions/permissions/workflow`,
        }),
      ]);
      const activeRuleset = Array.isArray(activeRulesets)
        ? activeRulesets.find(
            (entry) =>
              entry.name === "Standard Roastery main" &&
              entry.enforcement === "active" &&
              Number.isInteger(entry.id),
          )
        : undefined;
      const rulesetDetail = activeRuleset
        ? await transport.api({
            method: "GET",
            path: `repos/${target}/rulesets/${activeRuleset.id}`,
          })
        : undefined;
      if (
        repository?.full_name?.toLowerCase() !== target ||
        repository.private !== false ||
        repository.fork !== true ||
        repository.parent?.full_name !== SOURCE ||
        repository.default_branch !== preview.target.defaultBranch ||
        reference?.object?.sha !== merge.commit ||
        !protectedRepository(repository) ||
        !protectedActions(actionPermissions) ||
        !protectedSelectedActions(selectedActions) ||
        !protectedWorkflowPermissions(workflowPermissions) ||
        !protectedRuleset(rulesetDetail)
      ) {
        throw new GitHubBoundaryError("owned_verification_failed");
      }
      const query = `?ref=${encodeURIComponent(merge.commit)}`;
      const [
        manifestResponse,
        indexResponse,
        licenseResponse,
        codeownersResponse,
        beans,
      ] = await Promise.all([
        transport.api({
          method: "GET",
          path: `repos/${target}/contents/roastery/roastery.json${query}`,
        }),
        transport.api({
          method: "GET",
          path: `repos/${target}/contents/roastery/index.json${query}`,
        }),
        transport.api({
          method: "GET",
          path: `repos/${target}/contents/roastery/CONTENT_LICENSE.md${query}`,
        }),
        transport.api({
          method: "GET",
          path: `repos/${target}/contents/CODEOWNERS${query}`,
        }),
        transport.api({
          method: "GET",
          path: `repos/${target}/contents/roastery/beans${query}`,
          allowNotFound: true,
        }),
      ]);
      const expectedManifest = `${JSON.stringify(
        {
          repository: preview.target.repository,
          contract: preview.contract,
        },
        null,
        2,
      )}\n`;
      const manifest = decodeFile(manifestResponse, "invalid_owned_manifest");
      const index = decodeFile(indexResponse, "invalid_owned_index");
      const license = decodeFile(licenseResponse, "invalid_owned_license");
      const codeowners = decodeFile(
        codeownersResponse,
        "invalid_owned_codeowners",
      );
      if (
        manifest !== expectedManifest ||
        index !== '{\n  "beans": []\n}\n' ||
        license !== preview.declaration.content ||
        codeowners !== ownerCodeowners(preview.target.owner) ||
        beans !== undefined ||
        parseContentLicense(license).digest !== preview.declaration.digest
      ) {
        throw new GitHubBoundaryError("owned_content_mismatch");
      }
      return {
        status: "verified",
        repository: preview.target.repository,
        commit: merge.commit,
      };
    },
  };
}

function invokeGh(args, input) {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      input,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, GH_PROMPT_DISABLED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr)
        : "";
    if (/\b(?:HTTP 404|Not Found)\b/iu.test(stderr)) {
      throw new GitHubBoundaryError("github_not_found");
    }
    throw new GitHubBoundaryError("github_cli_failed");
  }
}

export function createGhTransport() {
  return {
    /** @param {GitHubApiRequest} request */
    async api({ method, path, body, allowNotFound = false }) {
      try {
        const args = ["api", "--method", method, path];
        const input = body === undefined ? undefined : JSON.stringify(body);
        if (input !== undefined) args.push("--input", "-");
        const output = invokeGh(args, input).trim();
        return output === "" ? {} : JSON.parse(output);
      } catch (error) {
        if (
          allowNotFound &&
          error instanceof GitHubBoundaryError &&
          error.code === "github_not_found"
        ) {
          return undefined;
        }
        throw error;
      }
    },

    async enableAutoMerge({ repository, number, expectedHead }) {
      invokeGh([
        "pr",
        "merge",
        String(number),
        "--repo",
        repository,
        "--auto",
        "--squash",
        "--delete-branch",
        "--match-head-commit",
        expectedHead,
      ]);
    },
  };
}
