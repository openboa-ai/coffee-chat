import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../runtime/coffee-chat.mjs", import.meta.url);
const generated = `#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export * from "../src/index.mjs";
export { runCli } from "../src/cli.mjs";

import { runCli } from "../src/cli.mjs";

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  process.exitCode = await runCli();
}
`;

const current = await readFile(target, "utf8").catch(() => "");
if (current !== generated && process.argv.includes("--check")) {
  console.error("Deterministic runtime projection is stale.");
  process.exit(1);
}
if (current !== generated) await writeFile(target, generated, "utf8");
console.log("Deterministic runtime is current.");
