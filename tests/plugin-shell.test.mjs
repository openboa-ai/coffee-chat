import assert from "node:assert/strict";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const capabilities = Object.freeze([
  "init",
  "sync",
  "unsync",
  "roast",
  "brew",
  "coffee-chat",
  "coffee-blend",
]);
const expectedIdentityFields = Object.freeze([
  "name",
  "version",
  "description",
  "homepage",
  "repository",
  "license",
]);

function json(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function invoke(script, capability, cwd) {
  const result = spawnSync(process.execPath, [join(root, script), capability], {
    cwd,
    encoding: "utf8",
  });
  return {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: JSON.parse(result.stdout),
  };
}

function files(path) {
  const absolute = join(root, path);
  if (statSync(absolute).isFile()) return [path];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((child) => {
    const nested = join(path, child.name);
    return child.isDirectory() ? files(nested) : [nested];
  });
}

test("portable and OpenAI manifests are separate projections of one CalVer identity", () => {
  const metadata = json("config/plugin-metadata.json");
  const portable = json("plugin.json");
  const openai = json(".codex-plugin/plugin.json");

  assert.match(
    metadata.version,
    /^\d{4}\.(?:[1-9]|1[0-2])\.(?:[1-9]|[12]\d|3[01])$/u,
  );
  assert.equal(
    portable.$schema,
    "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  );
  assert.equal(openai.skills, "./skills/");
  for (const field of expectedIdentityFields) {
    assert.deepEqual(portable[field], metadata[field], `portable ${field}`);
    assert.deepEqual(openai[field], metadata[field], `OpenAI ${field}`);
  }
  assert.notDeepEqual(portable, openai);
  assert.equal("skills" in portable, false);
});

test("all seven capability Skills are discoverable and have fixed launchers", () => {
  assert.deepEqual(
    readdirSync(join(root, "skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map(({ name }) => name)
      .sort(),
    [...capabilities].sort(),
  );

  for (const capability of capabilities) {
    const skill = readFileSync(
      join(root, "skills", capability, "SKILL.md"),
      "utf8",
    );
    assert.match(skill, new RegExp(`^---\\nname: ${capability}\\n`, "u"));
    assert.match(skill, /status: not_implemented/u);
    assert.match(skill, /later product implementation Goal/u);
    assert.doesNotThrow(() =>
      readFileSync(join(root, "skills", capability, "scripts/run.mjs"), "utf8"),
    );
  }
});

test("every capability returns one deterministic closed not_implemented result", () => {
  const scratch = mkdtempSync(join(tmpdir(), "coffee-chat-shell-"));
  try {
    for (const capability of capabilities) {
      const first = invoke("runtime/coffee-chat.mjs", capability, scratch);
      const second = invoke("runtime/coffee-chat.mjs", capability, scratch);
      assert.equal(first.exitCode, 3, capability);
      assert.equal(first.stderr, "", capability);
      assert.deepEqual(first, second, capability);
      assert.deepEqual(first.stdout, {
        schema: "coffee-chat-capability-result",
        calver: "2026.8.9",
        capability,
        status: "not_implemented",
        implementationOwner: "later product implementation Goal",
        sideEffects: {
          network: false,
          filesystem: false,
          git: false,
          github: false,
          registry: false,
          cache: false,
          publication: false,
        },
      });

      const skill = invoke(
        `skills/${capability}/scripts/run.mjs`,
        capability,
        scratch,
      );
      assert.deepEqual(skill, first, capability);
      assert.deepEqual(readdirSync(scratch), [], capability);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the shipped shell contains no forbidden component, data, or write surface", () => {
  const forbiddenPaths = [
    "contract",
    "mcp.json",
    ".mcp.json",
    ".app.json",
    "hooks",
    "roastery",
    "evaluation",
    "benchmark",
    "engine",
    "cache",
    "registry",
  ];
  const shippedRoots = [
    ".agents",
    ".codex-plugin",
    "config",
    "docs",
    "runtime",
    "skills",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "plugin.json",
  ];
  const paths = shippedRoots.flatMap(files);
  for (const path of paths) {
    const lowered = path.toLowerCase();
    assert.equal(
      forbiddenPaths.some((segment) => lowered.split("/").includes(segment)),
      false,
      path,
    );
  }

  const productText = paths
    .filter((path) => /\.(?:json|md|mjs)$/u.test(path))
    .map((path) => readFileSync(join(root, path), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    productText,
    /\b(?:persona|Green Bean|Harvest|Pairing|SemVer|v1)\b/u,
  );
  assert.doesNotMatch(productText, /node:(?:fs|http|https|net|child_process)/u);
});
