import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "skills", "init", "scripts", "run.mjs");

function run(cwd, state, ...args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: "",
      COFFEE_CHAT_STATE_DIR: state,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout ? JSON.parse(result.stdout) : undefined,
    stderr: result.stderr ? JSON.parse(result.stderr) : undefined,
  };
}

test("the Init Skill previews and preserves zero writes for every non-accepted path", () => {
  const scratch = mkdtempSync(join(tmpdir(), "coffee-chat-init-cli-"));
  const state = join(scratch, "state");
  const cwd = join(scratch, "work");
  mkdirSync(cwd);
  try {
    const preview = run(
      cwd,
      state,
      "preview",
      "--owner",
      "Example",
      "--attribution",
      "Example Owner",
    );
    assert.equal(preview.status, 0);
    assert.equal(preview.stderr, undefined);
    assert.equal(preview.stdout.status, "preview");
    assert.equal(existsSync(state), false);
    assert.deepEqual(readdirSync(cwd), []);

    for (const decision of ["reject", "cancel"]) {
      const result = run(
        cwd,
        state,
        "apply",
        "--owner",
        "Example",
        "--attribution",
        "Example Owner",
        "--decision",
        decision,
        "--preview-digest",
        preview.stdout.previewDigest,
      );
      assert.equal(result.status, 0);
      assert.deepEqual(result.stdout, {
        status: decision === "reject" ? "rejected" : "cancelled",
      });
      assert.equal(existsSync(state), false);
      assert.deepEqual(readdirSync(cwd), []);
    }

    for (const args of [
      ["preview", "--owner", "Example", "--attribution", ""],
      [
        "preview",
        "--owner",
        "Example",
        "--attribution",
        "Example Owner",
        "--license",
        "CC0-1.0",
      ],
    ]) {
      const result = run(cwd, state, ...args);
      assert.equal(result.status, 64);
      assert.equal(result.stderr.status, "invalid");
      assert.equal(existsSync(state), false);
      assert.deepEqual(readdirSync(cwd), []);
    }
    assert.deepEqual(readdirSync(scratch), ["work"]);
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
});
