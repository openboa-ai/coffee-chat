import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { resolveBuildRevision } from "../scripts/build-revision.mjs";

function git(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

test("release revision accepts only the exact clean committed source", () => {
  const root = mkdtempSync(join(tmpdir(), "coffee-chat-release-revision-"));
  const priorRevision = process.env.COFFEE_CHAT_BUILD_REVISION;
  try {
    git(root, "init", "--quiet");
    writeFileSync(join(root, "tracked.txt"), "committed\n");
    git(root, "add", "tracked.txt");
    git(
      root,
      "-c",
      "user.name=openboa",
      "-c",
      "user.email=263508246+openboa@users.noreply.github.com",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    );
    const head = git(root, "rev-parse", "HEAD");
    process.env.COFFEE_CHAT_BUILD_REVISION = head;
    assert.deepEqual(resolveBuildRevision(root, { release: true }), {
      buildRevision: head,
      revisionState: "release_commit",
    });

    writeFileSync(join(root, "untracked.txt"), "not in the revision\n");
    assert.throws(
      () => resolveBuildRevision(root, { release: true }),
      /committed, byte-identical source/u,
    );
  } finally {
    if (priorRevision === undefined)
      delete process.env.COFFEE_CHAT_BUILD_REVISION;
    else process.env.COFFEE_CHAT_BUILD_REVISION = priorRevision;
    rmSync(root, { recursive: true, force: true });
  }
});
