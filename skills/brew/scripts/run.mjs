#!/usr/bin/env node
import { runCli } from "../../../runtime/coffee-chat.mjs";

process.exitCode = await runCli({ argv: ["brew", ...process.argv.slice(2)] });
