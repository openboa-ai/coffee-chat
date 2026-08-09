#!/usr/bin/env node
import { runCli } from "../../../runtime/coffee-chat.mjs";

process.exitCode = await runCli({
  argv: ["coffee-blend", ...process.argv.slice(2)],
});
