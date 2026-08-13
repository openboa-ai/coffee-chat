#!/usr/bin/env node
import { runInitCli } from "../../../runtime/init-cli.mjs";

process.exitCode = await runInitCli(process.argv.slice(2));
