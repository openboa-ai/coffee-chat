import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { createOwnedRegistry, RegistryError } from "../runtime/registry.mjs";

test("owned registration is read-only before verification and atomic afterward", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "coffee-chat-registry-"));
  const path = join(scratch, "state", "registry.json");
  const repository = "https://github.com/example/coffee-chat";
  const preview = { target: { repository } };
  const record = {
    role: "owned",
    repository,
    commit: "d".repeat(40),
    contract: {
      repository: "https://github.com/openboa-ai/coffee-chat-roastery",
      commit: "c".repeat(40),
      digest: `sha256:${"e".repeat(64)}`,
    },
  };

  try {
    const registry = createOwnedRegistry({ path });
    assert.deepEqual(await registry.preflightOwned(preview), {
      status: "ready",
      repository,
    });
    assert.equal(existsSync(dirname(path)), false);

    assert.deepEqual(await registry.registerOwned(record), {
      status: "registered",
      record,
    });
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), {
      calver: "2026.8.13",
      owned: record,
    });
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(dirname(path)), ["registry.json"]);
    assert.deepEqual(await registry.preflightOwned(preview), {
      status: "failed",
      code: "owned_registration_exists",
    });
    await assert.rejects(
      () => registry.registerOwned(record),
      (error) =>
        error instanceof RegistryError &&
        error.code === "owned_registration_exists",
    );

    writeFileSync(path, "not-json\n", { mode: 0o600 });
    assert.deepEqual(await registry.preflightOwned(preview), {
      status: "failed",
      code: "invalid_registry",
    });
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
});
