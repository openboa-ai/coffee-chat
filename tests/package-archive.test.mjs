import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { collectFiles, packageRoots } from "../scripts/package-lib.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const capabilities = [
  "init",
  "sync",
  "unsync",
  "roast",
  "brew",
  "coffee-chat",
  "coffee-blend",
];

test("package smoke is isolated and contains only the declared Plugin", () => {
  const before = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(before.status, 0, before.stderr);
  const smoke = spawnSync(process.execPath, ["scripts/package-smoke.mjs"], {
    encoding: "utf8",
  });
  assert.equal(smoke.status, 0, `${smoke.stdout}\n${smoke.stderr}`);
  const after = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(after.status, 0, after.stderr);
  assert.equal(after.stdout, before.stdout);
  assert.equal(packageRoots.includes("submission"), false);
  assert.equal(
    packageRoots.some((path) => path.startsWith("submission/")),
    false,
  );
  assert.deepEqual(capabilities, [
    "init",
    "sync",
    "unsync",
    "roast",
    "brew",
    "coffee-chat",
    "coffee-blend",
  ]);
});

test("the packaged README keeps every local image target", async () => {
  const [readme, files] = await Promise.all([
    readFile(`${root}/README.md`, "utf8"),
    collectFiles(root),
  ]);
  const packagedPaths = new Set(files.map(({ path }) => path));
  const localImages = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/gu)]
    .map((match) => match[1])
    .filter((target) => !/^(?:https?:|data:)/u.test(target));

  assert.deepEqual(localImages, [
    "docs/assets/readme/coffee-chat-hero.png",
    "docs/assets/readme/coffee-chat-judgment.png",
    "docs/assets/readme/coffee-chat-talk-work.png",
  ]);
  for (const target of localImages) {
    assert.ok(packagedPaths.has(target), `missing packaged image: ${target}`);
  }
});

test("the package ships the Agent installation guide", async () => {
  const files = await collectFiles(root);
  const packagedPaths = new Set(files.map(({ path }) => path));

  assert.ok(packageRoots.includes("INSTALL_FOR_AGENTS.md"));
  assert.ok(packagedPaths.has("INSTALL_FOR_AGENTS.md"));
});
