import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  collectFiles,
  inventory,
  packageBundle,
  packageRoots,
  packageZip,
  sha256,
} from "./package-lib.mjs";
import { resolveBuildRevision } from "./build-revision.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const build = join(root, "build");
const plugin = join(build, "coffee-chat-plugin");
const revision = resolveBuildRevision(root, {
  release: process.argv.includes("--release"),
});

await rm(build, { recursive: true, force: true });
await mkdir(plugin, { recursive: true });
for (const path of packageRoots) {
  const source = join(root, path);
  const target = join(plugin, path);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
  });
}

const candidatePath = join(plugin, "submission/release-candidate.json");
const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
candidate.buildRevision = revision.buildRevision;
candidate.revisionState = revision.revisionState;
await writeFile(
  candidatePath,
  `${JSON.stringify(candidate, null, 2)}\n`,
  "utf8",
);

const files = await collectFiles(plugin);
const bundle = packageBundle(files);
const zip = packageZip(files);
const skillFiles = files.filter(({ path }) => path.startsWith("skills/"));
const payloadFiles = files.filter(
  ({ path }) => !path.startsWith("submission/"),
);
const receipt = {
  format: "coffee-chat-package-receipt-1",
  ...revision,
  packageDigest: `sha256:${sha256(bundle)}`,
  archiveDigest: `sha256:${sha256(zip)}`,
  pluginPayloadDigest: `sha256:${sha256(packageBundle(payloadFiles))}`,
  skillBundleDigest: `sha256:${sha256(packageBundle(skillFiles))}`,
  files: inventory(files),
};
await writeFile(join(build, "coffee-chat-plugin.bundle"), bundle);
await writeFile(join(build, "coffee-chat-plugin.zip"), zip);
await writeFile(
  join(build, "package-receipt.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);
console.log(
  JSON.stringify({
    status: "built",
    files: files.length,
    packageDigest: receipt.packageDigest,
    archiveDigest: receipt.archiveDigest,
  }),
);
