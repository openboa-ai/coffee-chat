import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { collectFiles, packageBundle, sha256 } from "./package-lib.mjs";

export const paths = Object.freeze({
  projection:
    "docs/migration/selections/tasks-4-7-8-11-initial-submission-ready-baseline.json",
  equality:
    "docs/migration/equality/tasks-4-7-8-11-initial-submission-ready-baseline.json",
  receipt:
    "docs/migration/receipts/tasks-4-7-8-11-initial-submission-ready-baseline.json",
});

const expectedSurfaces = new Set([
  "build-and-repository-tooling",
  "contract/roastery/**",
  "documentation-and-policy",
  "governance-and-ci",
  "migration-policy-schemas-and-checker",
  "objective-tests",
  "official-license",
  "plugin-manifests-and-marketplace",
  "public-policy-docs",
  "release-and-sbom-attestation",
  "runtime-and-product-contracts",
  "skills",
  "skills/unsync/**",
  "smallest-deterministic-runtime",
  "submission/**",
]);

function surfaceFor(path) {
  if (path === "LICENSE") return "official-license";
  if (
    path.startsWith("docs/migration/") ||
    path.startsWith(".github/migration-") ||
    [
      "scripts/check-migration-receipt.mjs",
      "scripts/generate-migration-receipt.mjs",
      "scripts/migration-receipt-lib.mjs",
    ].includes(path)
  )
    return "migration-policy-schemas-and-checker";
  if (path.startsWith("contract/roastery/")) return "contract/roastery/**";
  if (path.startsWith("skills/unsync/")) return "skills/unsync/**";
  if (path.startsWith("skills/")) return "skills";
  if (path.startsWith("submission/")) return "submission/**";
  if (["docs/privacy.md", "docs/terms.md", "docs/support.md"].includes(path))
    return "public-policy-docs";
  if (
    [
      ".github/workflows/release.yml",
      ".github/workflows/sbom-attestation.yml",
      "scripts/generate-sbom.mjs",
    ].includes(path)
  )
    return "release-and-sbom-attestation";
  if (
    path === "plugin.json" ||
    path.startsWith(".codex-plugin/") ||
    path.startsWith(".agents/plugins/") ||
    path === "config/plugin-metadata.json"
  )
    return "plugin-manifests-and-marketplace";
  if (path.startsWith("tests/")) return "objective-tests";
  if (path.startsWith(".github/") || path === "CODEOWNERS")
    return "governance-and-ci";
  if (
    path.startsWith("src/contracts") ||
    path.startsWith("src/release/") ||
    path === "config/roastery-contract.json"
  )
    return "runtime-and-product-contracts";
  if (path.startsWith("src/") || path.startsWith("runtime/"))
    return "smallest-deterministic-runtime";
  if (
    ["AGENTS.md", "README.md", "SECURITY.md", "docs/quality-map.md"].includes(
      path,
    )
  )
    return "documentation-and-policy";
  if (
    path.startsWith("scripts/") ||
    [
      ".editorconfig",
      ".gitattributes",
      ".gitignore",
      "package.json",
      "package-lock.json",
      "prettier.config.mjs",
      "tsconfig.json",
    ].includes(path)
  )
    return "build-and-repository-tooling";
  throw new Error(`Unclassified changed path: ${path}`);
}

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

function gitPaths(root, args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "buffer" })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function buildMigrationReceipt(root) {
  const projectionBytes = await readFile(resolve(root, paths.projection));
  const equalityBytes = await readFile(resolve(root, paths.equality));
  const projection = JSON.parse(projectionBytes.toString("utf8"));
  const equality = JSON.parse(equalityBytes.toString("utf8"));
  const projectionDigest = sha256(projectionBytes);
  if (projectionDigest !== equality.projection_sha256)
    throw new Error(
      "Projection digest differs from the workspace equality receipt.",
    );
  for (const field of ["target_owner", "task", "objective", "ledger_sha256"]) {
    if (projection[field] !== equality[field])
      throw new Error(`Projection/equality mismatch: ${field}`);
  }
  const selected = new Set(
    projection.selected_rows.map((row) =>
      [
        row.source_repository,
        row.source_ref,
        row.source_commit,
        row.source_path,
      ].join("\0"),
    ),
  );
  const referenced = new Set(
    projection.changed_surface_classification
      .flatMap((entry) => entry.selected_rows ?? [])
      .map((row) =>
        [
          row.source_repository,
          row.source_ref,
          row.source_commit,
          row.source_path,
        ].join("\0"),
      ),
  );
  if (
    selected.size !== referenced.size ||
    [...selected].some((key) => !referenced.has(key))
  )
    throw new Error(
      "Every selected ledger row must be referenced by changed-surface evidence.",
    );
  for (const entry of projection.changed_surface_classification) {
    if (
      !expectedSurfaces.has(entry.target_path_or_surface) &&
      ![
        "control-plane-evidence",
        "excluded-legacy-product-surfaces",
        "docs/migration/**",
      ].includes(entry.target_path_or_surface)
    ) {
      throw new Error(
        `Unexpected selection surface: ${entry.target_path_or_surface}`,
      );
    }
  }

  const mergePolicy = JSON.parse(
    await readFile(resolve(root, ".github/merge-policy.json"), "utf8"),
  );
  const base = mergePolicy.migration?.base_commit;
  if (
    !/^[0-9a-f]{40}$/u.test(base) ||
    git(root, ["rev-parse", `${base}^{commit}`]) !== base
  ) {
    throw new Error("Migration base commit is missing or invalid.");
  }
  const changed = new Set([
    ...gitPaths(root, [
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      "-z",
      base,
      "--",
    ]),
    ...gitPaths(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    paths.receipt,
  ]);
  const changedPaths = [...changed]
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((path) => ({ path, surface: surfaceFor(path) }));
  const rows = projection.selected_rows;
  const migrateEvidence = [];
  for (const row of rows.filter(({ action }) => action === "migrate")) {
    const targetBytes = await readFile(
      resolve(root, row.target_path_or_surface),
    );
    const targetDigest = sha256(targetBytes);
    if (targetDigest !== row.content_sha256)
      throw new Error(
        `Exact-byte migrate mismatch: ${row.target_path_or_surface}`,
      );
    migrateEvidence.push({
      source_repository: row.source_repository,
      source_commit: row.source_commit,
      source_path: row.source_path,
      source_blob_oid: row.source_blob_oid,
      source_sha256: row.content_sha256,
      target_path: row.target_path_or_surface,
      target_sha256: targetDigest,
      status: "passed",
    });
  }
  const packagedFiles = await collectFiles(root);
  const packageDigest = `sha256:${sha256(packageBundle(packagedFiles))}`;
  return {
    schema: "coffee-chat/migration-receipt",
    target_owner: projection.target_owner,
    task: projection.task,
    objective: projection.objective,
    base_commit: base,
    empty_base_tree: git(root, ["rev-parse", `${base}^{tree}`]),
    projection_sha256: projectionDigest,
    equality_receipt_sha256: sha256(equalityBytes),
    changed_paths_sha256: sha256(Buffer.from(canonical(changedPaths))),
    package_digest: packageDigest,
    changed_paths: changedPaths,
    migrate_evidence: migrateEvidence,
    action_counts: Object.fromEntries(
      ["migrate", "rewrite", "exclude"].map((action) => [
        action,
        rows.filter((row) => row.action === action).length,
      ]),
    ),
    verification: {
      local_deterministic: "passed",
      same_repository_ci: "pending",
      exact_head_review: "pending",
      squash_merge: "pending",
      control_plane: "pending",
    },
  };
}

export function renderMigrationReceipt(value) {
  return canonical(value);
}
