import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

test("combined baseline carries generated selection equality and computed receipt", () => {
  for (const path of [
    "docs/migration/selections/tasks-4-7-8-11-initial-submission-ready-baseline.json",
    "docs/migration/equality/tasks-4-7-8-11-initial-submission-ready-baseline.json",
    "docs/migration/receipts/tasks-4-7-8-11-initial-submission-ready-baseline.json",
    "scripts/check-migration-receipt.mjs",
  ]) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }
});
