#!/usr/bin/env node
import { runCapabilityCli } from "../../../runtime/coffee-chat.mjs";

process.exitCode = runCapabilityCli("sync");
