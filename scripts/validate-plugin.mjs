import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { contractDigest } from "./contract-digest.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const readJson = (path) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
const failures = [];
const fail = (message) => failures.push(message);
const metadata = readJson("config/plugin-metadata.json");
const portable = readJson("plugin.json");
const openai = readJson(".codex-plugin/plugin.json");
const pin = readJson("config/roastery-contract.json");

if (
  !/^\d{4}\.(?:[1-9]|1[0-2])\.(?:[1-9]|[12]\d|3[01])$/u.test(metadata.version)
) {
  fail(
    "metadata version must use one marketplace-accepted calendar identifier",
  );
}
for (const [name, manifest] of [
  ["portable", portable],
  ["openai", openai],
]) {
  for (const key of [
    "name",
    "version",
    "description",
    "homepage",
    "repository",
    "license",
  ]) {
    if (manifest[key] !== metadata[key])
      fail(`${name} manifest ${key} differs from metadata`);
  }
  if (manifest.author?.name !== metadata.publisher.name)
    fail(`${name} author differs from metadata`);
  for (const forbidden of ["mcpServers", "apps", "hooks"]) {
    if (forbidden in manifest)
      fail(`${name} manifest contains forbidden ${forbidden}`);
  }
}
const portableKeys = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
]);
for (const key of Object.keys(portable))
  if (!portableKeys.has(key))
    fail(`portable manifest has unsupported key ${key}`);
if (
  portable.$schema !==
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
)
  fail("portable manifest schema changed");
if (openai.skills !== "./skills/") fail("OpenAI Skill root must be ./skills/");
if (
  !Array.isArray(openai.interface?.defaultPrompt) ||
  openai.interface.defaultPrompt.length > 3
)
  fail("OpenAI defaultPrompt must contain at most three entries");

const skillNames = [
  "init",
  "sync",
  "unsync",
  "roast",
  "brew",
  "coffee-chat",
  "coffee-blend",
];
const actualSkills = readdirSync(resolve(root, "skills"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (JSON.stringify(actualSkills) !== JSON.stringify([...skillNames].sort()))
  fail("Skill set must be exactly the seven approved Skills");
for (const skill of skillNames) {
  for (const path of [
    `skills/${skill}/SKILL.md`,
    `skills/${skill}/references`,
    `skills/${skill}/scripts/run.mjs`,
  ]) {
    if (!existsSync(resolve(root, path))) fail(`missing Skill surface ${path}`);
  }
}
for (const forbidden of [
  ".mcp.json",
  ".app.json",
  "hooks.json",
  "server",
  "servers",
  "apps",
  "hooks",
  "mcp",
]) {
  if (existsSync(resolve(root, forbidden)))
    fail(`forbidden package surface exists: ${forbidden}`);
}
const marketplace = readJson(".agents/plugins/marketplace.json");
if (
  marketplace.plugins?.length !== 1 ||
  marketplace.plugins[0].name !== metadata.name ||
  marketplace.plugins[0].source?.path !== "../.."
) {
  fail(
    "repo-local marketplace does not resolve exactly one Coffee Chat Plugin root",
  );
}
const actualContractDigest = await contractDigest(
  resolve(root, "contract/roastery"),
);
if (actualContractDigest !== pin.bundleDigest)
  fail(`vendored contract digest mismatch: ${actualContractDigest}`);
if (pin.repository !== "https://github.com/openboa-ai/coffee-chat-roastery")
  fail("Roastery contract repository changed");
const pending =
  pin.commit.startsWith("__PENDING_") && pin.commit.endsWith("__");
if (!pending && !/^[0-9a-f]{40}$/u.test(pin.commit))
  fail("Roastery contract commit must be one full commit");
if (process.argv.includes("--release") && pending)
  fail("release validation requires the final protected-main Roastery commit");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Plugin projections, seven Skills, marketplace, and contract digest are valid${pending ? "; commit pin pending" : ""}.`,
  );
}
