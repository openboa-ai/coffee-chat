#!/usr/bin/env node
import { runCli } from "../../../runtime/coffee-chat.mjs";

process.exitCode = await runCli({
  argv: ["coffee-chat", ...process.argv.slice(2)],
});
