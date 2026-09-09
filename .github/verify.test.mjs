import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const source = resolve(import.meta.dirname, "..");
function fixture(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), "coffee-chat-verify-"));
  const env = { ...process.env, CI_POLICY_ROOT: root };
  delete env.GIT_INDEX_FILE;
  try {
    const files = execFileSync("git", ["ls-files", "-z"], { cwd: source, encoding: "utf8", env }).split("\0").filter(Boolean);
    for (const path of files) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      cpSync(join(source, path), join(root, path));
    }
    mutate(root);
    execFileSync("git", ["init", "-q"], { cwd: root, env });
    execFileSync("git", ["add", "-f", "--all"], { cwd: root, env });
    return spawnSync(process.execPath, [join(source, ".github/verify.mjs")], { cwd: root, env, encoding: "utf8" });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("accepts the current repository contract", () => {
  const result = fixture();
  assert.equal(result.status, 0, result.stderr);
});

test("rejects divergent host identity", () => {
  const result = fixture((root) => {
    const path = join(root, ".codex-plugin/plugin.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.name = "wrong-plugin";
    writeFileSync(path, JSON.stringify(manifest));
  });
  assert.notEqual(result.status, 0, result.stdout);
});
test("rejects invalid Skill frontmatter", () => {
  const result = fixture((root) => writeFileSync(join(root, "skills/roast/SKILL.md"), "---\nname: other\ndescription: test\n---\n"));
  assert.notEqual(result.status, 0, result.stdout);
});
