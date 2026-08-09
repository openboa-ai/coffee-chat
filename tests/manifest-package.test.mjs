import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("portable and OpenAI manifests are independent CalVer projections", () => {
  assert.equal(existsSync("plugin.json"), true, "portable manifest must exist");
  assert.equal(
    existsSync(".codex-plugin/plugin.json"),
    true,
    "OpenAI manifest must exist",
  );
  const portable = readJson("plugin.json");
  const openai = readJson(".codex-plugin/plugin.json");
  assert.equal(
    portable.$schema,
    "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  );
  assert.equal(openai.skills, "./skills/");
  assert.equal(portable.version, openai.version);
  assert.equal(portable.version, "2026.8.9");
  for (const manifest of [portable, openai]) {
    assert.equal(manifest.name, "coffee-chat");
    assert.equal(manifest.license, "MIT");
    assert.equal("mcpServers" in manifest, false);
    assert.equal("apps" in manifest, false);
    assert.equal("hooks" in manifest, false);
  }
});

test("exactly seven Skills use contained launchers", () => {
  assert.equal(existsSync("skills"), true, "skills directory must exist");
  const names = [
    "init",
    "sync",
    "unsync",
    "roast",
    "brew",
    "coffee-chat",
    "coffee-blend",
  ];
  for (const name of names) {
    assert.equal(
      existsSync(`skills/${name}/SKILL.md`),
      true,
      `${name} skill missing`,
    );
    assert.equal(
      existsSync(`skills/${name}/scripts/run.mjs`),
      true,
      `${name} launcher missing`,
    );
    assert.match(
      readFileSync(`skills/${name}/scripts/run.mjs`, "utf8"),
      /\.\.\/\.\.\/\.\.\/runtime\/coffee-chat\.mjs/u,
    );
  }
  assert.deepEqual(
    readdirSync("skills", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(),
    [...names].sort(),
  );
});

test("the trusted Roastery commit is isolated while exact contract bytes remain fixed", () => {
  const pin = readJson("config/roastery-contract.json");
  const pendingToken = ["__PENDING", "ROASTERY", "MAIN", "COMMIT__"].join("_");
  assert.equal(pin.commit, pendingToken);
  assert.equal(
    pin.bundleDigest,
    "sha256:6cc68d5ecff920235c093922a563e9297fc0e7f073f831070c822c0df56ca151",
  );
  const result = spawnSync(
    "rg",
    ["-l", pendingToken, ".", "--glob", "!build/**"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "./config/roastery-contract.json",
  ]);
});

test("the release candidate command fails before rebuilding while the contract pin is pending", () => {
  const before = readFileSync("build/package-receipt.json");
  const revision = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout.trim();
  const result = spawnSync("npm", ["run", "release:candidate"], {
    encoding: "utf8",
    env: { ...process.env, COFFEE_CHAT_BUILD_REVISION: revision },
  });
  assert.equal(result.status, 1);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /final protected-main Roastery commit/u,
  );
  assert.deepEqual(readFileSync("build/package-receipt.json"), before);
});

test("deterministic ZIP has one contained plugin root and stays inside current portal limits", () => {
  const receipt = readJson("build/package-receipt.json");
  assert.ok(receipt.files.length > 0 && receipt.files.length <= 5_000);
  assert.ok(
    receipt.files.reduce((total, file) => total + file.bytes, 0) <=
      512 * 1024 * 1024,
  );
  for (const file of receipt.files) {
    assert.ok(file.bytes <= 100 * 1024 * 1024, file.path);
    assert.ok(file.path.split("/").length + 1 <= 20, file.path);
    assert.doesNotMatch(file.path, /(?:^|\/)\.\.(?:\/|$)|\\|^\//u);
  }
  assert.ok(
    readFileSync("build/coffee-chat-plugin.zip").length <= 100 * 1024 * 1024,
  );
  const listing = spawnSync("unzip", ["-Z1", "build/coffee-chat-plugin.zip"], {
    encoding: "utf8",
  });
  assert.equal(listing.status, 0, listing.stderr);
  const members = listing.stdout.trim().split("\n");
  assert.ok(
    members.every(
      (path) =>
        path.startsWith("coffee-chat/") &&
        !path.slice("coffee-chat/".length).startsWith("/"),
    ),
  );
  assert.ok(members.includes("coffee-chat/.codex-plugin/plugin.json"));
  assert.equal(
    new Set(members.map((path) => path.normalize("NFC").toLowerCase())).size,
    members.length,
  );
});
