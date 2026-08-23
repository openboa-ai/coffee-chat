import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createInitPreview } from "../runtime/init.mjs";
import { dispatch } from "../runtime/coffee-chat.mjs";
import { collectFiles } from "../scripts/package-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = join(root, "config", "capabilities.json");
const expectedCalver = "2026.8.23";
const expectedCapabilities = Object.freeze([
  {
    id: "init",
    skill: "coffee-init",
    entrypoint: "skills/coffee-init/scripts/run.mjs",
    state: "available",
  },
  {
    id: "sync",
    skill: "coffee-sync",
    entrypoint: "skills/coffee-sync/scripts/run.mjs",
    state: "not_implemented",
  },
  {
    id: "unsync",
    skill: "coffee-unsync",
    entrypoint: "skills/coffee-unsync/scripts/run.mjs",
    state: "not_implemented",
  },
  {
    id: "roast",
    skill: "coffee-roast",
    entrypoint: "skills/coffee-roast/scripts/run.mjs",
    state: "not_implemented",
  },
  {
    id: "brew",
    skill: "coffee-brew",
    entrypoint: "skills/coffee-brew/scripts/run.mjs",
    state: "not_implemented",
  },
  {
    id: "coffee-chat",
    skill: "coffee-chat",
    entrypoint: "skills/coffee-chat/scripts/run.mjs",
    state: "not_implemented",
  },
  {
    id: "coffee-blend",
    skill: "coffee-blend",
    entrypoint: "skills/coffee-blend/scripts/run.mjs",
    state: "not_implemented",
  },
]);

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

test("the public capability contract owns exact Skill discovery without adding behavior", async () => {
  const contract = await json(contractPath);

  assert.deepEqual(Object.keys(contract), [
    "schema",
    "product",
    "calver",
    "interface",
    "capabilities",
  ]);
  assert.equal(contract.schema, "coffee-chat-capabilities-v1");
  assert.equal(contract.product, "coffee-chat");
  assert.equal(contract.calver, expectedCalver);
  assert.equal(contract.interface, "skills");
  assert.deepEqual(contract.capabilities, expectedCapabilities);

  for (const capability of contract.capabilities) {
    const absoluteEntrypoint = resolve(root, capability.entrypoint);
    assert.equal(
      relative(root, absoluteEntrypoint).startsWith(`..${sep}`),
      false,
      capability.id,
    );
    const entrypoint = await lstat(absoluteEntrypoint);
    assert.equal(entrypoint.isFile(), true, capability.id);
    assert.equal(entrypoint.isSymbolicLink(), false, capability.id);

    const skillRoot = resolve(root, "skills", capability.skill);
    assert.equal(
      relative(skillRoot, absoluteEntrypoint).startsWith(`..${sep}`),
      false,
      capability.id,
    );
    const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
    assert.match(skill, new RegExp(`^---\\nname: ${capability.skill}\\n`, "u"));
    assert.match(skill, new RegExp(`status: ${capability.state}`, "u"));

    const result = dispatch(capability.id);
    assert.equal(result.calver, contract.calver, capability.id);
    assert.equal(result.capability, capability.id, capability.id);
    assert.equal(result.status, capability.state, capability.id);
    if (capability.state === "available") {
      assert.equal(result.entrypoint, capability.entrypoint, capability.id);
    }
  }
});

test("the capability contract shares one CalVer with product and package identity", async () => {
  const [contract, metadata, portable, openai, packagedFiles] =
    await Promise.all([
      json(contractPath),
      json(join(root, "config", "plugin-metadata.json")),
      json(join(root, "plugin.json")),
      json(join(root, ".codex-plugin", "plugin.json")),
      collectFiles(root),
    ]);

  assert.equal(contract.calver, expectedCalver);
  assert.equal(metadata.version, contract.calver);
  assert.equal(portable.version, contract.calver);
  assert.equal(openai.version, contract.calver);
  assert.equal(
    createInitPreview({ owner: "example", attribution: "Example Owner" })
      .calver,
    contract.calver,
  );

  const packagedContract = packagedFiles.find(
    ({ path }) => path === "config/capabilities.json",
  );
  assert.ok(packagedContract);
  assert.deepEqual(
    JSON.parse(packagedContract.bytes.toString("utf8")),
    contract,
  );
});
