import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guidePath = join(root, "INSTALL_FOR_AGENTS.md");
const skillsRoot = join(root, "skills");
const expectedSkillNames = [
  "coffee-init",
  "coffee-sync",
  "coffee-unsync",
  "coffee-roast",
  "coffee-brew",
  "coffee-chat",
  "coffee-blend",
];

test("the Agent install guide preserves the official install boundary", async () => {
  const guide = await readFile(guidePath, "utf8");
  const pluginManifest = JSON.parse(
    await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"),
  );
  const prose = guide.replace(/\s+/gu, " ");
  const inspect = guide.indexOf("codex plugin marketplace list --json");
  const addMarketplace = guide.indexOf(
    "codex plugin marketplace add openboa-ai/coffee-chat --ref main --json",
  );
  const refreshMarketplace = guide.indexOf(
    "codex plugin marketplace upgrade openboa-ai --json",
  );
  const refreshedInstalled = guide.indexOf(
    "codex plugin list --json",
    refreshMarketplace,
  );
  const compareVersions = guide.indexOf("Compare the installed version");

  assert.match(guide, /\*\*Publisher:\*\* Openboa AI/u);
  assert.match(
    guide,
    /\*\*Official source:\*\* `https:\/\/github\.com\/openboa-ai\/coffee-chat`/u,
  );
  assert.match(guide, /\*\*Official Codex marketplace:\*\* `openboa-ai`/u);
  assert.match(
    guide,
    new RegExp(
      `\\*\\*Official CalVer:\\*\\* \`${pluginManifest.version}\``,
      "u",
    ),
  );
  assert.ok(inspect >= 0 && inspect < addMarketplace);
  assert.ok(addMarketplace < refreshMarketplace);
  assert.ok(refreshMarketplace < refreshedInstalled);
  assert.ok(refreshedInstalled < compareVersions);
  assert.match(guide, /codex plugin add coffee-chat@openboa-ai --json/u);
  assert.doesNotMatch(guide, /codex plugin remove coffee-chat@openboa-ai/u);
  assert.match(
    prose,
    /If the versions differ, ask for the user's approval to reinstall only that Plugin from the refreshed official marketplace/u,
  );
  assert.doesNotMatch(
    prose,
    /already installed and enabled from the official source, do not reinstall it\. Continue to verification/u,
  );
  assert.match(prose, /Do not install from a personal fork/u);
  assert.match(prose, /Do not clone or copy Plugin files/u);
  assert.match(
    prose,
    /must not create, fork, sync, activate, or publish a Roastery/u,
  );
  assert.match(prose, /explicit acceptance before any external write/u);
});

test("the Agent install guide routes every shipped coffee-prefixed Skill", async () => {
  const [guide, directoryEntries, manifestText] = await Promise.all([
    readFile(guidePath, "utf8"),
    readdir(skillsRoot, { withFileTypes: true }),
    readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const prose = guide.replace(/\s+/gu, " ");
  const skillDirectories = directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.equal(manifest.name, "coffee-chat");
  assert.deepEqual(skillDirectories, [...expectedSkillNames].sort());

  const frontmatterNames = [];
  for (const directory of skillDirectories) {
    const skill = await readFile(
      join(skillsRoot, directory, "SKILL.md"),
      "utf8",
    );
    const match = skill.match(/^---\nname: ([a-z0-9-]+)\n/u);
    assert.ok(match, `missing Skill name: ${directory}`);
    assert.equal(match[1], directory, `Skill name must match: ${directory}`);
    frontmatterNames.push(match[1]);
  }
  assert.deepEqual(frontmatterNames.sort(), [...expectedSkillNames].sort());

  const routingStart = guide.indexOf("Route later requests by intent:");
  const routingEnd = guide.indexOf(
    "Until those Skills are implemented",
    routingStart,
  );
  assert.notEqual(routingStart, -1);
  assert.notEqual(routingEnd, -1);

  const routing = guide.slice(routingStart, routingEnd);
  const routedSkills = [...routing.matchAll(/`\$(coffee-[a-z-]+)`/gu)].map(
    (match) => match[1],
  );
  assert.deepEqual(new Set(routedSkills), new Set(expectedSkillNames));
  assert.equal(routedSkills.length, expectedSkillNames.length);
  assert.match(
    routing,
    /`\$coffee-blend`[^\n]*several explicitly selected Roasteries/iu,
  );
  assert.match(
    prose,
    /use the installed host's discovered identifier for that named Skill/iu,
  );
});
