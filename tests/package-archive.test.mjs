import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { packageRoots } from "../scripts/package-lib.mjs";

const capabilities = [
  "init",
  "sync",
  "unsync",
  "roast",
  "brew",
  "coffee-chat",
  "coffee-blend",
];

test("package smoke is isolated and contains only the declared shell", () => {
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
