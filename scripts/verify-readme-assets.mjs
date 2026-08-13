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
const assets = new Map([
  ["hero", { filename: "coffee-chat-hero.png", width: 1774, height: 887 }],
  [
    "judgment",
    { filename: "coffee-chat-judgment.png", width: 1576, height: 998 },
  ],
  [
    "talk-work",
    { filename: "coffee-chat-talk-work.png", width: 1576, height: 998 },
  ],
]);

assert.deepEqual(
  audit.images.map(({ kind }) => kind),
  [...assets.keys()],
  "README image audit must describe exactly the three production images",
);

for (const { kind, output_sha256: digest } of audit.images) {
  const asset = assets.get(kind);
  assert.ok(asset, `unsupported README image kind: ${kind}`);
  const { filename, width, height } = asset;
  const image = await readFile(join(assetRoot, filename));
  assert.deepEqual(
    image.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    `${filename} must remain a PNG`,
  );
  assert.equal(image.readUInt32BE(16), width, `${filename} width`);
  assert.equal(image.readUInt32BE(20), height, `${filename} height`);
  assert.equal(
    createHash("sha256").update(image).digest("hex"),
    digest,
    `${filename} does not match its reviewed audit digest`,
  );
}

process.stdout.write(`${JSON.stringify({ status: "readme_assets_valid" })}\n`);
