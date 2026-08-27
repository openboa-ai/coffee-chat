import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.env.CI_POLICY_ROOT ?? ".");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

assert.equal(existsSync(resolve(root, ".npmrc")), false);
assert.equal(existsSync(resolve(root, "npm-shrinkwrap.json")), false);
assert.deepEqual(
  readdirSync(resolve(root, ".github/workflows"))
    .filter((name) => /\.ya?ml$/u.test(name))
    .sort(),
  ["trusted.yml"],
);

const portable = readJson("plugin.json");
assert.equal(
  portable.$schema,
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
);
assert.equal(portable.name, "coffee-chat");
assert.equal(typeof portable.version, "string");
assert.equal(typeof portable.description, "string");
assert.deepEqual(Object.keys(portable).sort(), [
  "$schema",
  "author",
  "description",
  "homepage",
  "keywords",
  "license",
  "name",
  "repository",
  "version",
]);

const codex = readJson(".codex-plugin/plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
assert.deepEqual(readdirSync(resolve(root, ".codex-plugin")).sort(), ["plugin.json"]);
assert.deepEqual(readdirSync(resolve(root, ".claude-plugin")).sort(), ["plugin.json"]);
for (const [label, manifest] of [
  ["codex", codex],
  ["claude", claude],
]) {
  assert.equal(manifest.name, portable.name, label);
  assert.equal(manifest.version, portable.version, label);
  assert.equal(manifest.description, portable.description, label);
}
assert.equal(codex.skills, "./skills/");

for (const forbidden of [
  "mcp.json",
  ".mcp.json",
  "hooks",
  "commands",
  "agents",
  "assets",
  ".agents",
  "config",
  "contract",
  "docs",
  "marketplace",
  "runtime",
  "scripts",
  "tests",
]) {
  assert.equal(existsSync(resolve(root, forbidden)), false, forbidden);
}

const skillRoot = resolve(root, "skills");
const skills = readdirSync(skillRoot).sort();
assert.deepEqual(skills, ["brew", "roast"]);
for (const skill of skills) {
  const path = resolve(skillRoot, skill, "SKILL.md");
  assert.equal(existsSync(path), true, skill);
  assert.deepEqual(readdirSync(resolve(skillRoot, skill)).sort(), ["SKILL.md"], skill);
  const source = readFileSync(path, "utf8");
  assert.match(source, /^---\n/u, skill);
  assert.match(source, new RegExp(`^name: ${skill}$`, "mu"), skill);
  assert.match(source, /^description: .+$/mu, skill);
}

console.log("Coffee Chat structure and manifest policy passed.");
