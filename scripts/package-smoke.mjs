import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { capabilities } from "../runtime/coffee-chat.mjs";
import { collectFiles, packageRoots, packageZip } from "./package-lib.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "coffee-chat-package-"));
try {
  const plugin = join(temporaryRoot, "coffee-chat");
  await mkdir(plugin, { recursive: true });
  for (const path of packageRoots) {
    const target = join(plugin, path);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(root, path), target, {
      recursive: true,
      dereference: false,
      errorOnExist: true,
    });
  }
  const files = await collectFiles(plugin);
  await writeFile(join(temporaryRoot, "coffee-chat.zip"), packageZip(files));

  for (const capability of capabilities) {
    const result = spawnSync(
      process.execPath,
      [join(plugin, "skills", capability, "scripts/run.mjs")],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 3, capability);
    assert.equal(result.stderr, "", capability);
    assert.equal(
      JSON.parse(result.stdout).status,
      "not_implemented",
      capability,
    );
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ status: "package_smoke_passed" })}\n`);
