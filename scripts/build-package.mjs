import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectFiles, packageRoots, packageZip } from "./package-lib.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const files = await collectFiles(root);
const archive = packageZip(files);
assert.ok(files.length > packageRoots.length);
assert.ok(archive.length > 0);
process.stdout.write(`${JSON.stringify({ status: "package_shape_valid" })}\n`);
