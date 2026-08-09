#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  buildMigrationReceipt,
  paths,
  renderMigrationReceipt,
} from "./migration-receipt-lib.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const target = resolve(root, paths.receipt);
await mkdir(dirname(target), { recursive: true });
await writeFile(
  target,
  renderMigrationReceipt(await buildMigrationReceipt(root)),
  "utf8",
);
console.log(`Generated ${paths.receipt}`);
