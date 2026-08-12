import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(root, "docs", "assets", "readme");
const temporaryRoot = await mkdtemp(join(root, ".readme-assets-"));
const canonicalRenderer =
  "python:3.12.7-slim-bookworm@sha256:1c44018d7eb40488f29e7c6ad4991d3200507e14dca71b94fe61011815e98155";

try {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--platform",
      "linux/amd64",
      "--mount",
      `type=bind,src=${root},dst=/repo,readonly`,
      "--mount",
      `type=bind,src=${temporaryRoot},dst=/out`,
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
    { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  assert.equal(
    result.status,
    0,
    [result.error?.message, result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n"),
  );

  const [expectedAudit, actualAudit] = await Promise.all([
    readFile(join(assetRoot, "explanatory-images.audit.json"), "utf8"),
    readFile(join(temporaryRoot, "explanatory-images.audit.json"), "utf8"),
  ]);
  assert.deepEqual(
    JSON.parse(actualAudit),
    JSON.parse(expectedAudit),
    "README image audit is not reproducible",
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
  await rm(temporaryRoot, { recursive: true, force: true });
}
