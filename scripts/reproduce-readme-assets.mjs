import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(root, "docs", "assets", "readme");
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "coffee-chat-readme-assets-"),
);
const canonicalRenderer =
  "python:3.12.7-slim-bookworm@sha256:1c44018d7eb40488f29e7c6ad4991d3200507e14dca71b94fe61011815e98155";
let containerId;

function runDocker(arguments_, message) {
  const result = spawnSync("docker", arguments_, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    [message, result.error?.message, result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n"),
  );
  return result.stdout.trim();
}

try {
  containerId = runDocker(
    [
      "create",
      "--platform",
      "linux/amd64",
      "--mount",
      `type=bind,src=${root},dst=/repo,readonly`,
      "--workdir",
      "/repo",
      canonicalRenderer,
      "sh",
      "-euc",
      [
        "PIP_ROOT_USER_ACTION=ignore python -m pip install",
        "--disable-pip-version-check --no-cache-dir",
        "--require-hashes -r docs/assets/readme/source/requirements.txt >/dev/null",
        "&& python docs/assets/readme/source/compose_explanatory_images.py",
        "--judgment-source docs/assets/readme/source/coffee-chat-judgment-illustration.png",
        "--talk-work-source docs/assets/readme/source/coffee-chat-talk-work-illustration.png",
        "--output-dir /out",
        "--audit /out/explanatory-images.audit.json",
      ].join(" "),
    ],
    "Could not create the canonical README renderer",
  );
  assert.match(containerId, /^[0-9a-f]{64}$/u);
  runDocker(
    ["start", "--attach", containerId],
    "Canonical README rendering failed",
  );
  runDocker(
    ["cp", `${containerId}:/out/.`, temporaryRoot],
    "Could not copy canonical README outputs",
  );

  const prettier = spawnSync(
    process.execPath,
    [
      join(root, "node_modules", "prettier", "bin", "prettier.cjs"),
      "--write",
      join(temporaryRoot, "explanatory-images.audit.json"),
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(
    prettier.status,
    0,
    [prettier.error?.message, prettier.stdout, prettier.stderr]
      .filter(Boolean)
      .join("\n"),
  );

  const [expectedAudit, actualAudit] = await Promise.all([
    readFile(join(assetRoot, "explanatory-images.audit.json")),
    readFile(join(temporaryRoot, "explanatory-images.audit.json")),
  ]);
  assert.deepEqual(
    actualAudit,
    expectedAudit,
    "README image audit bytes are not reproducible",
  );

  for (const filename of [
    "coffee-chat-judgment.png",
    "coffee-chat-talk-work.png",
  ]) {
    const [expected, actual] = await Promise.all([
      readFile(join(assetRoot, filename)),
      readFile(join(temporaryRoot, filename)),
    ]);
    assert.deepEqual(actual, expected, `${filename} is not reproducible`);
  }

  process.stdout.write(
    `${JSON.stringify({
      renderer: canonicalRenderer,
      status: "readme_assets_reproduced",
    })}\n`,
  );
} finally {
  if (containerId) {
    spawnSync("docker", ["rm", "--force", containerId], {
      cwd: root,
      stdio: "ignore",
    });
  }
  await rm(temporaryRoot, { recursive: true, force: true });
}
