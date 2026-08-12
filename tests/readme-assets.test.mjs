import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = join(root, "README.md");
const heroPath = join(root, "docs", "assets", "readme", "coffee-chat-hero.png");
const judgmentPath = join(
  root,
  "docs",
  "assets",
  "readme",
  "coffee-chat-judgment.png",
);
const talkWorkPath = join(
  root,
  "docs",
  "assets",
  "readme",
  "coffee-chat-talk-work.png",
);
const auditPath = join(
  root,
  "docs",
  "assets",
  "readme",
  "explanatory-images.audit.json",
);
const fontPath = join(
  root,
  "docs",
  "assets",
  "readme",
  "source",
  "MartianGrotesk-wdth-wght.ttf",
);
const expectedDigest =
  "cb8211087ff8998119ac08a46e477c02d1c61b99e71fa1aadd63c62d78d21bfc";
const expectedPillowVersion = "12.3.0";
const expectedFontDigest =
  "f81807163c34ff754e6d915b0b59f76cca88332b67c45cfc7453ace5751ae912";
const removedBrewHeadline =
  "A record becomes useful when it shapes what happens next.";
const expectedIllustrationSources = new Set([
  "coffee-chat-judgment-illustration.png",
  "coffee-chat-talk-work-illustration.png",
]);
const explanatoryAssets = [
  {
    path: judgmentPath,
    reference: "docs/assets/readme/coffee-chat-judgment.png",
    digest: "cbed16b176522ba59e26f737f7f53856bc85e79329ecb575a8a7063172cfb165",
  },
  {
    path: talkWorkPath,
    reference: "docs/assets/readme/coffee-chat-talk-work.png",
    digest: "484484c8deda13d9c5ea426b4a4e417687584502364f618b02f306a80b67d5e8",
  },
];

test("the README uses the selected raster hero", async () => {
  const [readme, hero] = await Promise.all([
    readFile(readmePath, "utf8"),
    readFile(heroPath),
  ]);

  assert.deepEqual(
    hero.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  assert.equal(hero.readUInt32BE(16), 1774);
  assert.equal(hero.readUInt32BE(20), 887);
  assert.equal(createHash("sha256").update(hero).digest("hex"), expectedDigest);
  assert.match(readme, /\]\(docs\/assets\/readme\/coffee-chat-hero\.png\)/u);
  assert.doesNotMatch(readme, /\.svg\b/u);
});

test("the explanatory images use deterministic canonical OpenBoa type", async () => {
  const [readme, auditText, font] = await Promise.all([
    readFile(readmePath, "utf8"),
    readFile(auditPath, "utf8"),
    readFile(fontPath),
  ]);
  const audit = JSON.parse(auditText);

  assert.equal(
    createHash("sha256").update(font).digest("hex"),
    expectedFontDigest,
  );
  for (const asset of explanatoryAssets) {
    const image = await readFile(asset.path);
    assert.deepEqual(
      image.subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    assert.equal(image.readUInt32BE(16), 1576);
    assert.equal(image.readUInt32BE(20), 998);
    assert.equal(
      createHash("sha256").update(image).digest("hex"),
      asset.digest,
    );
    assert.ok(readme.includes(`](${asset.reference})`), asset.reference);
  }
  assert.equal(audit.images.length, 2);
  for (const image of audit.images) {
    assert.equal(image.font, "MartianGrotesk-wdth-wght.ttf");
    assert.equal(image.font_sha256, expectedFontDigest);
    assert.equal(image.pillow_version, expectedPillowVersion);
    assert.deepEqual(image.canvas, [1576, 998]);
    assert.ok(expectedIllustrationSources.has(image.source));
    assert.ok(!image.source.includes("/"));
    for (const record of image.records) {
      assert.equal(record.font, "MartianGrotesk-wdth-wght.ttf");
      assert.equal(record.paint, "#111820");
      assert.ok([450, 550, 650].includes(record.axes.wght));
      assert.ok([96, 100].includes(record.axes.wdth));
      assert.match(
        record.token,
        /^ref\.typography\.styles\.(?:overline|body\.lg|heading\.lg)$/u,
      );
    }
  }
  const talkWorkAudit = audit.images.find(
    (image) => image.kind === "talk-work",
  );
  assert.ok(talkWorkAudit);
  assert.ok(!talkWorkAudit.copy.includes(removedBrewHeadline));
  assert.ok(
    !talkWorkAudit.records.some(
      (record) => record.text === removedBrewHeadline,
    ),
  );
  for (const image of audit.images) {
    const expectedSizes = { overline: 42, body: 20, heading: 35 };
    for (const record of image.records) {
      assert.equal(record.font_size, expectedSizes[record.role]);
      assert.equal(
        record.shaping,
        record.role === "overline"
          ? "custom-tracked-glyphs"
          : "native-whole-string",
      );
      assert.equal(record.tracking_em, record.role === "overline" ? 0.08 : 0);
    }
  }
});

test("the README presents the complete first Coffee Chat release", async () => {
  const readme = await readFile(readmePath, "utf8");

  assert.match(readme, /^> \[!IMPORTANT\] \*\*WIP\*\*/u);
  assert.equal((readme.match(/\bWIP\b/gu) ?? []).length, 1);
  assert.match(readme, /Coffee Chat is an Agent Plugin/u);
  assert.match(readme, /owner-reviewed/iu);
  assert.match(readme, /LLM wiki \/ second brain/u);
  assert.match(readme, /Agent memory/u);
  assert.match(readme, /Digital self/u);
  assert.match(readme, /## One record\. Two uses\./u);
  assert.match(readme, /## Origin\. Bean\. Coffee\./u);
  for (const skill of [
    "coffee-init",
    "coffee-sync",
    "coffee-roast",
    "coffee-brew",
    "coffee-chat",
    "coffee-unsync",
  ]) {
    assert.ok(readme.includes(`\`$${skill}\``), skill);
  }
  assert.doesNotMatch(readme, /Codex-first/u);
  assert.doesNotMatch(readme, /LLM wiki[^\n]*(?:only|just) facts/iu);
  assert.doesNotMatch(readme, /coffee[- ]blend/iu);
});

test("every local README target exists", async () => {
  for (const target of [
    "docs/assets/readme/coffee-chat-hero.png",
    "docs/assets/readme/coffee-chat-judgment.png",
    "docs/assets/readme/coffee-chat-talk-work.png",
    "docs/assets/readme/explanatory-images.audit.json",
    "docs/assets/readme/source/compose_explanatory_images.py",
    "docs/assets/readme/source/coffee-chat-judgment-illustration.png",
    "docs/assets/readme/source/coffee-chat-talk-work-illustration.png",
    "docs/assets/readme/source/MartianGrotesk-wdth-wght.ttf",
    "docs/assets/readme/source/LICENSE-MartianGrotesk-OFL.txt",
    "docs/assets/readme/source/requirements.txt",
    "scripts/verify-readme-assets.mjs",
    "scripts/run-readme-assets-verify.mjs",
    "docs/product-boundaries.md",
    "contract/roastery/README.md",
    "docs/quality-map.md",
    "SECURITY.md",
    "LICENSE",
  ]) {
    await assert.doesNotReject(access(join(root, target)), target);
  }
});
