import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const commands = [
  ["scripts/validate-plugin.mjs", "--release"],
  ["scripts/build-runtime.mjs", "--check"],
  ["scripts/update-derived-submission.mjs", "--check"],
  ["scripts/build-package.mjs", "--release"],
  ["scripts/generate-sbom.mjs"],
];

for (const arguments_ of commands) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
