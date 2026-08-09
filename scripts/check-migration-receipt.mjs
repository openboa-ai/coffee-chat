#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import {
  buildMigrationReceipt,
  paths,
  renderMigrationReceipt,
} from "./migration-receipt-lib.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const expected = renderMigrationReceipt(await buildMigrationReceipt(root));
const actual = await readFile(resolve(root, paths.receipt), "utf8");
const projection = JSON.parse(
  await readFile(resolve(root, paths.projection), "utf8"),
);
const equality = JSON.parse(
  await readFile(resolve(root, paths.equality), "utf8"),
);
const receipt = JSON.parse(actual);
const ajv = new Ajv2020.default({ allErrors: true, strict: true });
const documents = [
  ["selection", projection, ".github/migration-selection.schema.json"],
  ["equality", equality, ".github/migration-equality-receipt.schema.json"],
  ["receipt", receipt, ".github/migration-receipt.schema.json"],
];
let schemaFailure = "";
for (const [label, value, schemaPath] of documents) {
  const schema = JSON.parse(await readFile(resolve(root, schemaPath), "utf8"));
  const validate = ajv.compile(schema);
  if (!validate(value))
    schemaFailure += `${label}: ${ajv.errorsText(validate.errors)}\n`;
}
if (schemaFailure) {
  console.error(`Migration schema validation failed:\n${schemaFailure.trim()}`);
  process.exitCode = 1;
} else if (actual !== expected) {
  console.error(
    "Migration receipt is stale or does not cover the complete changed/package surface. Run npm run migration:receipt.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "Migration selection equality, exact migrated bytes, classifications, and package evidence passed.",
  );
}
