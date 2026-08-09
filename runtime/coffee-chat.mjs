#!/usr/bin/env node
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
