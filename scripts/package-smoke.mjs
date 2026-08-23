import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { capabilities, skillNames } from "../runtime/coffee-chat.mjs";
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

  const capabilityContract = JSON.parse(
    await readFile(join(plugin, "config", "capabilities.json"), "utf8"),
  );
  assert.equal(capabilityContract.schema, "coffee-chat-capabilities-v1");
  assert.deepEqual(
    capabilityContract.capabilities.map(({ id }) => id),
    capabilities,
  );
  assert.deepEqual(
    Object.fromEntries(
      capabilityContract.capabilities.map(({ id, skill }) => [id, skill]),
    ),
    skillNames,
  );

  const init = spawnSync(
    process.execPath,
    [
      join(plugin, "skills", skillNames.init, "scripts/run.mjs"),
      "preview",
      "--owner",
      "example",
      "--attribution",
      "Example Owner",
    ],
    {
      encoding: "utf8",
      cwd: temporaryRoot,
      env: {
        ...process.env,
        COFFEE_CHAT_STATE_DIR: join(temporaryRoot, "state"),
      },
    },
  );
  assert.equal(init.status, 0, init.stderr);
  assert.equal(init.stderr, "");
  assert.equal(JSON.parse(init.stdout).status, "preview");

  for (const capability of capabilities.filter((name) => name !== "init")) {
    const result = spawnSync(
      process.execPath,
      [join(plugin, "skills", skillNames[capability], "scripts/run.mjs")],
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
