import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { computeContractDigest } from "../contract/roastery/dist/contract-digest.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = join(root, "contract", "roastery");
const authority = JSON.parse(
  readFileSync(join(root, "contract", "roastery-authority.json"), "utf8"),
);

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(path, entry.name);
    const name = relative(vendorRoot, absolute).split(sep).join("/");
    assert.equal(entry.isSymbolicLink(), false, name);
    if (entry.isDirectory()) return files(absolute);
    assert.equal(lstatSync(absolute).isFile(), true, name);
    return [name];
  });
}

test("the Plugin vendors one exact immutable Roastery authority", () => {
  assert.deepEqual(authority.contract, {
    repository: "https://github.com/openboa-ai/coffee-chat-roastery",
    commit: "d7d770af59a691b5ebceee9809ab436f32db33d5",
    tree: "566da28c57ab2ece5f6e06ffff51aa3546bf480f",
    digest:
      "sha256:878704aa835d167ea6ef6979f7cd0258cf02476b3f7c16926779f4f18ce75428",
  });
  assert.deepEqual(authority.seed, {
    repository: "https://github.com/openboa-ai/coffee-chat-roastery",
    commit: "483af109f8c42048edf5d36ccdad43d7fc49e5d3",
    tree: "ef6e9c081fb6844eb25e1f7d3b5374751ae826ad",
    defaultBranch: "main",
    forkName: "coffee-chat",
  });
  assert.notEqual(authority.contract.commit, authority.seed.commit);

  const actualFiles = Object.fromEntries(
    files(vendorRoot)
      .sort()
      .map((path) => [
        path,
        `sha256:${createHash("sha256")
          .update(readFileSync(join(vendorRoot, path)))
          .digest("hex")}`,
      ]),
  );
  assert.deepEqual(actualFiles, authority.vendorFiles);
  assert.equal(computeContractDigest(vendorRoot), authority.contract.digest);
});
