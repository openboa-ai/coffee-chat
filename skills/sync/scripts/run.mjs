#!/usr/bin/env node
import { runCli } from "../../../runtime/coffee-chat.mjs";

process.exitCode = await runCli({
  argv: [process.argv[2] ?? "sync", ...process.argv.slice(3)],
});
