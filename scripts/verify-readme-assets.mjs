import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(root, "docs", "assets", "readme");
const audit = JSON.parse(
  await readFile(join(assetRoot, "explanatory-images.audit.json"), "utf8"),
);
const expected = new Map(
  audit.images.map(({ kind, output_sha256 }) => [kind, output_sha256]),
);

assert.deepEqual(
  [...expected.keys()],
  ["judgment", "talk-work"],
  "README image audit must describe exactly the two production images",
);

for (const [kind, digest] of expected) {
  const filename =
    kind === "judgment"
      ? "coffee-chat-judgment.png"
      : "coffee-chat-talk-work.png";
  const image = await readFile(join(assetRoot, filename));
  assert.deepEqual(
    image.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    `${filename} must remain a PNG`,
  );
  assert.equal(image.readUInt32BE(16), 1576, `${filename} width`);
  assert.equal(image.readUInt32BE(20), 998, `${filename} height`);
  assert.equal(
    createHash("sha256").update(image).digest("hex"),
    digest,
    `${filename} does not match its reviewed audit digest`,
  );
}

process.stdout.write(`${JSON.stringify({ status: "readme_assets_valid" })}\n`);
