import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const heroSourcePath = join(
  root,
  "docs",
  "assets",
  "readme",
  "source",
  "coffee-chat-hero-illustration.png",
);
const expectedDigest =
  "c08e8550fd9cf8423c2286cd46feeef81f41c4d40c844e534350bd00314d11b0";
const expectedHeroSourceDigest =
  "cb8211087ff8998119ac08a46e477c02d1c61b99e71fa1aadd63c62d78d21bfc";
const expectedPillowVersion = "12.3.0";
const canonicalRenderer =
  "python:3.12.7-slim-bookworm@sha256:1c44018d7eb40488f29e7c6ad4991d3200507e14dca71b94fe61011815e98155";
const expectedFontDigest =
  "f81807163c34ff754e6d915b0b59f76cca88332b67c45cfc7453ace5751ae912";
const removedBrewHeadline =
  "A record becomes useful when it shapes what happens next.";
const expectedIllustrationSources = new Set([
  "coffee-chat-hero-illustration.png",
  "coffee-chat-judgment-illustration.png",
  "coffee-chat-talk-work-illustration.png",
]);
const expectedCopy = {
  hero: ["COFFEE CHAT"],
  judgment: [
    "ORIGIN",
    "ROAST",
    "BEAN",
    "The source",
    "Meaning · Priority · Next move",
    "Your reviewed judgment",
    "Same source. Different meaning. Different next move.",
  ],
  "talk-work": [
    "BEANS",
    "BREW",
    "COFFEE",
    "Reviewed judgments",
    "Select what matters now",
    "Talk · Work",
    "The same Beans ground Talk and Work.",
  ],
};
const expectedCanvas = {
  hero: [1774, 887],
  judgment: [1576, 998],
  "talk-work": [1576, 998],
};
const explanatoryAssets = [
  {
    path: judgmentPath,
    reference: "docs/assets/readme/coffee-chat-judgment.png",
    digest: "652c1889a2886f016a954591785b40efb951b22151f7c3568f8c77dc827d093b",
  },
  {
    path: talkWorkPath,
    reference: "docs/assets/readme/coffee-chat-talk-work.png",
    digest: "b07f50b2eafbd1bc97fcabc6441005c846996e6d2f01a2bd3cafbb938c558188",
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

test("all README images use deterministic canonical OpenBoa type", async () => {
  const [readme, auditText, font, heroSource] = await Promise.all([
    readFile(readmePath, "utf8"),
    readFile(auditPath, "utf8"),
    readFile(fontPath),
    readFile(heroSourcePath),
  ]);
  const audit = JSON.parse(auditText);

  assert.deepEqual(
    audit.images.find(({ kind }) => kind === "judgment")?.copy,
    expectedCopy.judgment,
  );
  assert.equal(
    createHash("sha256").update(font).digest("hex"),
    expectedFontDigest,
  );
  assert.equal(heroSource.readUInt32BE(16), 1774);
  assert.equal(heroSource.readUInt32BE(20), 887);
  assert.equal(
    createHash("sha256").update(heroSource).digest("hex"),
    expectedHeroSourceDigest,
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
  assert.deepEqual(
    audit.images.map(({ kind }) => kind),
    ["hero", "judgment", "talk-work"],
  );
  for (const image of audit.images) {
    assert.equal(image.font, "MartianGrotesk-wdth-wght.ttf");
    assert.equal(image.font_sha256, expectedFontDigest);
    assert.equal(image.pillow_version, expectedPillowVersion);
    assert.deepEqual(image.canvas, expectedCanvas[image.kind]);
    assert.deepEqual(image.copy, expectedCopy[image.kind]);
    assert.ok(expectedIllustrationSources.has(image.source));
    assert.ok(!image.source.includes("/"));
    for (const record of image.records) {
      assert.equal(record.font, "MartianGrotesk-wdth-wght.ttf");
      assert.ok(["#111820", "#A64F3C"].includes(record.paint));
      assert.ok([450, 550, 650].includes(record.axes.wght));
      assert.ok([96, 100].includes(record.axes.wdth));
      assert.match(
        record.token,
        /^ref\.typography\.styles\.(?:display\.2xl|overline|body\.lg|heading\.lg)$/u,
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
  const heroAudit = audit.images.find((image) => image.kind === "hero");
  assert.ok(heroAudit);
  assert.equal(heroAudit.records.length, 1);
  assert.equal(heroAudit.records[0].role, "hero-title");
  assert.ok(heroAudit.records[0].font_size >= 120);
  assert.equal(heroAudit.records[0].tracking_em, -0.025);
  assert.equal(heroAudit.records[0].shaping, "custom-tracked-glyphs");
  for (const image of audit.images.filter(({ kind }) => kind !== "hero")) {
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

test("README image verification is offline and reproduction is pinned", async () => {
  const [packageText, verifier, reproducer, workflow, assetGuide] =
    await Promise.all([
      readFile(join(root, "package.json"), "utf8"),
      readFile(join(root, "scripts", "verify-readme-assets.mjs"), "utf8"),
      readFile(join(root, "scripts", "reproduce-readme-assets.mjs"), "utf8"),
      readFile(join(root, ".github", "workflows", "quality.yml"), "utf8"),
      readFile(join(root, "docs", "assets", "readme", "README.md"), "utf8"),
    ]);
  const packageJson = JSON.parse(packageText);

  assert.equal(
    packageJson.scripts["readme:assets:verify"],
    "node scripts/verify-readme-assets.mjs",
  );
  assert.equal(
    packageJson.scripts["readme:assets:reproduce"],
    "node scripts/reproduce-readme-assets.mjs",
  );
  assert.doesNotMatch(verifier, /docker|https?:|pip install|spawnSync/iu);
  assert.ok(reproducer.includes(canonicalRenderer));
  assert.match(reproducer, /spawnSync\(\s*"docker"/u);
  assert.match(reproducer, /node_modules[\s\S]*prettier[\s\S]*prettier\.cjs/u);
  assert.match(reproducer, /mkdtemp\(\s*join\(tmpdir\(\)/u);
  assert.doesNotMatch(reproducer, /mkdtemp\(join\(root/u);
  assert.match(
    reproducer,
    /assert\.deepEqual\(\s*actualAudit,\s*expectedAudit/u,
  );
  assert.ok(assetGuide.includes(canonicalRenderer));
  assert.doesNotMatch(workflow, /setup-python/u);
  assert.doesNotMatch(workflow, /pip install/u);
  assert.doesNotMatch(workflow, /readme:assets:reproduce/u);
});

test("the offline verifier accepts all three reviewed README images", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-readme-assets.mjs"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  assert.equal(
    result.status,
    0,
    [result.error?.message, result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n"),
  );
  assert.match(result.stdout, /"status":"readme_assets_valid"/u);
});

test("the README presents the complete first Coffee Chat release", async () => {
  const readme = await readFile(readmePath, "utf8");
  const prose = readme.replaceAll("\n> ", " ").replace(/\s+/gu, " ");

  assert.match(readme, /^> \[!IMPORTANT\] \*\*WIP\*\*/u);
  assert.equal((readme.match(/\bWIP\b/gu) ?? []).length, 1);
  assert.match(readme, /Coffee Chat is an \*\*Agent Plugin\*\*/u);
  assert.match(readme, /owner-reviewed/iu);
  assert.match(
    readme,
    /## The same information can lead two people in different directions\./u,
  );
  assert.match(
    readme,
    /What it meant to you → What mattered to you → What you would do/u,
  );
  assert.match(
    prose,
    /As Agents make execution cheaper, deciding what matters becomes the bottleneck\./u,
  );
  assert.match(readme, /## Store judgment, not just information\./u);
  assert.match(readme, /## Use it in Talk and Work\./u);
  assert.match(readme, /## Install with your Agent/u);
  assert.match(
    readme,
    /https:\/\/raw\.githubusercontent\.com\/openboa-ai\/coffee-chat\/main\/INSTALL_FOR_AGENTS\.md/u,
  );
  assert.match(readme, /## You stay in control\./u);
  assert.match(readme, /## Go deeper\./u);
  const mentalModel = readme.indexOf(
    "## The same information can lead two people in different directions.",
  );
  const install = readme.indexOf("## Install with your Agent");
  const dataDifference = readme.indexOf(
    "## Store judgment, not just information.",
  );
  const uses = readme.indexOf("## Use it in Talk and Work.");
  const trust = readme.indexOf("## You stay in control.");
  const deeper = readme.indexOf("## Go deeper.");
  assert.ok(mentalModel < install);
  assert.ok(install < dataDifference);
  assert.ok(dataDifference < uses);
  assert.ok(uses < trust);
  assert.ok(trust < deeper);
  assert.doesNotMatch(readme, /Codex-first/u);
  assert.doesNotMatch(readme, /codex plugin/u);
  assert.doesNotMatch(readme, /LLM wiki[^\n]*(?:only|just) facts/iu);
  assert.doesNotMatch(readme, /LLM wiki \/ second brain/u);
  assert.doesNotMatch(readme, /Coffee Chat's one-of-one design/u);
  assert.doesNotMatch(readme, /coffee[- ]blend/iu);
  assert.doesNotMatch(
    readme,
    /## Coffee Chat records your judgment—not just the information behind it\./u,
  );
  assert.doesNotMatch(readme, /## One Bean\. Two uses\./u);
  assert.doesNotMatch(readme, /## Your judgment stays yours\./u);
  assert.doesNotMatch(readme, /## Documentation/u);
});

test("the README separates the first-release vision from current availability", async () => {
  const readme = await readFile(readmePath, "utf8");
  const prose = readme.replaceAll("\n> ", " ").replace(/\s+/gu, " ");

  assert.match(
    prose,
    /Only `\$coffee-init` is implemented today; the rest of the first-release Skills are not yet available\./u,
  );
  assert.doesNotMatch(readme, /## Start with Coffee Chat/u);
  assert.doesNotMatch(prose, /When the first release is available, install/u);
  assert.doesNotMatch(prose, /The first-release journey is short/u);
  assert.doesNotMatch(readme, /`\$coffee-init` and `\$coffee-roast` show/u);
  assert.doesNotMatch(readme, /`\$coffee-brew` and `\$coffee-chat` use/u);
});

test("every local README target exists", async () => {
  for (const target of [
    "docs/assets/readme/coffee-chat-hero.png",
    "docs/assets/readme/coffee-chat-judgment.png",
    "docs/assets/readme/coffee-chat-talk-work.png",
    "docs/assets/readme/explanatory-images.audit.json",
    "docs/assets/readme/source/compose_explanatory_images.py",
    "docs/assets/readme/source/coffee-chat-hero-illustration.png",
    "docs/assets/readme/source/coffee-chat-judgment-illustration.png",
    "docs/assets/readme/source/coffee-chat-talk-work-illustration.png",
    "docs/assets/readme/source/MartianGrotesk-wdth-wght.ttf",
    "docs/assets/readme/source/LICENSE-MartianGrotesk-OFL.txt",
    "docs/assets/readme/source/requirements.txt",
    "scripts/reproduce-readme-assets.mjs",
    "scripts/verify-readme-assets.mjs",
    "INSTALL_FOR_AGENTS.md",
    "docs/product-boundaries.md",
    "contract/roastery/README.md",
    "docs/quality-map.md",
    "SECURITY.md",
    "LICENSE",
  ]) {
    await assert.doesNotReject(access(join(root, target)), target);
  }
});
