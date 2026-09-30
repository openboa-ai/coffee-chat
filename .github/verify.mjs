import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "yaml";

const root = resolve(process.env.CI_POLICY_ROOT ?? ".");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const trackedFiles = execFileSync("git", ["-C", root, "ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
// Compare complete paths: a same-named directory is not an allowed file.
// This is the published repository layout, not central security policy.
assert.deepEqual(trackedFiles.slice().sort(), [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".editorconfig",
  ".gitattributes",
  ".githooks/pre-commit",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/dependabot.yml",
  ".github/merge-policy.json",
  ".github/verify.mjs",
  ".github/verify.test.mjs",
  ".github/workflows/trusted.yml",
  ".gitignore",
  "AGENTS.md",
  "CODEOWNERS",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "package-lock.json",
  "package.json",
  "plugin.json",
  "skills/brew/SKILL.md",
  "skills/roast/SKILL.md"
], "unexpected or missing repository file");
for (const path of trackedFiles) {
  assert.equal(lstatSync(resolve(root, path)).isFile(), true, `${path}: regular file required`);
}

const portable = readJson("plugin.json");
const manifestKeys = [
  "$schema",
  "author",
  "description",
  "homepage",
  "keywords",
  "license",
  "name",
  "repository",
  "version",
];
const hostManifestKeys = manifestKeys.filter((key) => key !== "$schema");
function assertHttpsUrl(value, label) {
  assert.equal(typeof value, "string", `${label}: URL string`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    assert.fail(`${label}: valid URL`);
  }
  assert.equal(parsed.protocol, "https:", `${label}: HTTPS URL`);
  assert.ok(parsed.hostname, `${label}: URL host`);
  assert.equal(parsed.username, "", `${label}: URL credentials are not permitted`);
  assert.equal(parsed.password, "", `${label}: URL credentials are not permitted`);
}
function isSemver(value) {
  const match = value.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/u,
  );
  if (!match || match.slice(1, 4).some((part) => part.length > 1 && part.startsWith("0"))) {
    return false;
  }
  for (const [part, prerelease] of [
    [match[4], true],
    [match[5], false],
  ]) {
    if (!part) continue;
    for (const identifier of part.split(".")) {
      if (!/^[0-9A-Za-z-]+$/u.test(identifier)) return false;
      if (prerelease && /^\d+$/u.test(identifier) && identifier.length > 1 && identifier.startsWith("0")) {
        return false;
      }
    }
  }
  return true;
}
const assertSharedManifest = (manifest, label) => {
  assert.equal(manifest !== null && typeof manifest === "object", true, `${label}: object required`);
  assert.equal(typeof manifest.name, "string", `${label}.name`);
  assert.match(manifest.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u, `${label}.name`);
  assert.equal(typeof manifest.version, "string", `${label}.version`);
  assert.equal(isSemver(manifest.version), true, `${label}.version`);
  assert.equal(typeof manifest.description, "string", `${label}.description`);
  assert.ok(manifest.description.trim().length > 0, `${label}.description`);
  assert.equal(manifest.description.trim(), manifest.description, `${label}.description`);
  assert.equal(manifest.author !== null && typeof manifest.author === "object", true, `${label}.author`);
  assert.deepEqual(Object.keys(manifest.author).sort(), ["email", "name", "url"], `${label}.author keys`);
  assert.equal(typeof manifest.author.name, "string", `${label}.author.name`);
  assert.ok(manifest.author.name.trim().length > 0, `${label}.author.name`);
  assert.match(manifest.author.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/u, `${label}.author.email`);
  assertHttpsUrl(manifest.author.url, `${label}.author.url`);
  assertHttpsUrl(manifest.homepage, `${label}.homepage`);
  assertHttpsUrl(manifest.repository, `${label}.repository`);
  assert.equal(manifest.license, "MIT", `${label}.license`);
  assert.equal(Array.isArray(manifest.keywords), true, `${label}.keywords`);
  assert.ok(manifest.keywords.length > 0, `${label}.keywords`);
  assert.equal(manifest.keywords.every((keyword) => typeof keyword === "string" && keyword.length > 0), true, `${label}.keywords`);
  assert.equal(new Set(manifest.keywords).size, manifest.keywords.length, `${label}.keywords unique`);
};
assert.equal(
  portable.$schema,
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
);
assert.equal(portable.name, "coffee-chat");
assert.deepEqual(Object.keys(portable).sort(), manifestKeys);
assertSharedManifest(portable, "portable");

const codex = readJson(".codex-plugin/plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
assert.deepEqual(readdirSync(resolve(root, ".codex-plugin")).sort(), ["plugin.json"]);
assert.deepEqual(readdirSync(resolve(root, ".claude-plugin")).sort(), ["plugin.json"]);
assert.deepEqual(Object.keys(codex).sort(), [...hostManifestKeys, "interface", "skills"].sort());
assert.deepEqual(Object.keys(claude).sort(), hostManifestKeys);
assertSharedManifest(codex, "codex");
assertSharedManifest(claude, "claude");
for (const [label, manifest] of [
  ["codex", codex],
  ["claude", claude],
]) {
  for (const key of manifestKeys.slice(1)) {
    assert.deepEqual(manifest[key], portable[key], `${label}.${key}`);
  }
}
assert.equal(codex.skills, "./skills/");
assert.deepEqual(Object.keys(codex.interface).sort(), [
  "capabilities",
  "category",
  "defaultPrompt",
  "developerName",
  "displayName",
  "longDescription",
  "shortDescription",
  "websiteURL",
]);
assert.equal(codex.interface.displayName, "Coffee Chat");
assert.equal(codex.interface.developerName, portable.author.name);
assert.equal(codex.interface.category, "Productivity");
assert.deepEqual(codex.interface.capabilities, ["Skills"]);
assert.deepEqual(codex.interface.defaultPrompt, [
  "Capture my perspective from this source for my confirmation.",
  "Help me understand this person through their confirmed perspective.",
  "Apply my confirmed perspective to this decision or task.",
]);
assert.equal(
  codex.interface.defaultPrompt.every(
    (prompt) => typeof prompt === "string" && prompt.trim().length > 0 && prompt.length <= 128,
  ),
  true,
  "codex.interface.defaultPrompt entries must be bounded strings",
);
assert.equal(typeof codex.interface.shortDescription, "string");
assert.ok(codex.interface.shortDescription.trim().length > 0, "codex.interface.shortDescription must be non-empty");
assert.equal(typeof codex.interface.longDescription, "string");
assert.ok(codex.interface.longDescription.trim().length > 0, "codex.interface.longDescription must be non-empty");
assertHttpsUrl(codex.interface.websiteURL, "codex.interface.websiteURL");

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
function parseSkillFrontmatter(source, skill) {
  const lines = source.split("\n");
  assert.equal(lines[0], "---", `${skill}: frontmatter must start at line 1`);
  const closing = lines.findIndex((line, index) => index > 0 && line === "---");
  assert.notEqual(closing, -1, `${skill}: bounded frontmatter block`);
  const yamlSource = `${lines.slice(1, closing).join("\n")}\n`;
  assert.ok(Buffer.byteLength(yamlSource, "utf8") <= 32 * 1024, `${skill}: frontmatter size limit`);
  assert.equal(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(yamlSource),
    false,
    `${skill}: frontmatter control characters are not permitted`,
  );
  const document = parseDocument(yamlSource, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(document.errors, [], `${skill}: valid YAML frontmatter`);
  assert.deepEqual(document.warnings, [], `${skill}: YAML frontmatter warnings are not permitted`);
  let fields;
  try {
    fields = document.toJS({ maxAliasCount: 0 });
  } catch {
    assert.fail(`${skill}: YAML aliases are not permitted`);
  }
  assert.equal(fields !== null && typeof fields === "object" && !Array.isArray(fields), true, `${skill}: YAML mapping required`);
  assert.deepEqual(Object.keys(fields).sort(), ["description", "name"]);
  assert.equal(typeof fields.name, "string", `${skill}: YAML name scalar`);
  assert.equal(typeof fields.description, "string", `${skill}: YAML description scalar`);
  assert.ok(fields.description.trim(), `${skill}: YAML description content`);
  return fields;
}
for (const skill of skills) {
  const path = resolve(skillRoot, skill, "SKILL.md");
  assert.equal(existsSync(path), true, skill);
  assert.deepEqual(readdirSync(resolve(skillRoot, skill)).sort(), ["SKILL.md"], skill);
  const source = readFileSync(path, "utf8");
  const fields = parseSkillFrontmatter(source, skill);
  assert.equal(fields.name, skill, `${skill}: frontmatter name`);
}

console.log("Coffee Chat structure and manifest verification passed.");
