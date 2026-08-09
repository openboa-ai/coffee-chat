import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { format } from "prettier";

import { collectFiles, packageBundle, sha256 } from "./package-lib.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const check = process.argv.includes("--check");
const stale = [];
const files = await collectFiles(root);
const skillBundleDigest = `sha256:${sha256(
  packageBundle(files.filter(({ path }) => path.startsWith("skills/"))),
)}`;
const pluginPayloadDigest = `sha256:${sha256(
  packageBundle(files.filter(({ path }) => !path.startsWith("submission/"))),
)}`;

async function update(path, mutate) {
  const target = resolve(root, path);
  const value = JSON.parse(await readFile(target, "utf8"));
  mutate(value);
  const rendered = await format(JSON.stringify(value), { parser: "json" });
  if ((await readFile(target, "utf8")) !== rendered) {
    if (check) stale.push(path);
    else await writeFile(target, rendered, "utf8");
  }
}

await update("submission/listing.json", (value) => {
  value.skillBundleDigest = skillBundleDigest;
});
await update("submission/release-candidate.json", (value) => {
  value.skillBundleDigest = skillBundleDigest;
  value.pluginPayloadDigest = pluginPayloadDigest;
});
await update("submission/surface-support.json", (value) => {
  const local = value.surfaces.find(({ surface }) => surface === "codex-local");
  local.packageDigest = pluginPayloadDigest;
});
await update("submission/evidence/codex-local-acceptance.json", (value) => {
  value.pluginPayloadDigest = pluginPayloadDigest;
});

if (stale.length > 0) {
  console.error(`Derived submission evidence is stale: ${stale.join(", ")}`);
  process.exit(1);
}
console.log(
  JSON.stringify({
    status: "projected",
    skillBundleDigest,
    pluginPayloadDigest,
  }),
);
