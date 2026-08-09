#!/usr/bin/env node
import { runCli } from "../../../runtime/coffee-chat.mjs";

process.exitCode = await runCli({ argv: ["unsync", ...process.argv.slice(2)] });
