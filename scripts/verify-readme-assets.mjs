import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(root, "docs", "assets", "readme");
const sourceRoot = join(assetRoot, "source");
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "coffee-chat-readme-assets-"),
);

try {
  const result = spawnSync(
    process.env.PYTHON ?? "python3",
    [
      join(sourceRoot, "compose_explanatory_images.py"),
      "--judgment-source",
      join(sourceRoot, "coffee-chat-judgment-illustration.png"),
      "--talk-work-source",
      join(sourceRoot, "coffee-chat-talk-work-illustration.png"),
      "--output-dir",
      temporaryRoot,
      "--audit",
      join(temporaryRoot, "explanatory-images.audit.json"),
    ],
    { cwd: temporaryRoot, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
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

  const [expectedAudit, actualAudit] = await Promise.all([
    readFile(join(assetRoot, "explanatory-images.audit.json"), "utf8"),
    readFile(join(temporaryRoot, "explanatory-images.audit.json"), "utf8"),
  ]);
  assert.deepEqual(
    JSON.parse(actualAudit),
    JSON.parse(expectedAudit),
    "explanatory-images.audit.json is not reproducible",
  );

  process.stdout.write(
    `${JSON.stringify({ status: "readme_assets_reproduced" })}\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
