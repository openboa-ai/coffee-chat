import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const trustedContract = {
  repository: "https://github.com/openboa-ai/coffee-chat-roastery",
  commit: ["__PENDING", "ROASTERY", "MAIN", "COMMIT__"].join("_"),
  digest:
    "sha256:6cc68d5ecff920235c093922a563e9297fc0e7f073f831070c822c0df56ca151",
};

test("a clean extracted package executes locally with no install or Coffee persistence side effect", async () => {
  const archive = resolve("build/coffee-chat-plugin.zip");
  assert.equal(existsSync(archive), true);
  const installation = mkdtempSync(join(tmpdir(), "coffee-chat-installed-"));
  const extracted = spawnSync("unzip", ["-q", archive, "-d", installation], {
    encoding: "utf8",
  });
  assert.equal(extracted.status, 0, extracted.stderr);
  const plugin = join(installation, "coffee-chat");
  const executable = join(plugin, "runtime/coffee-chat.mjs");
  const publicRuntime = await import(pathToFileURL(executable).href);
  assert.equal(
    "createVerifiedAcquisitionBoundary" in publicRuntime,
    false,
    "the verified-acquisition constructor must remain host-internal",
  );
  const marketplace = JSON.parse(
    readFileSync(join(plugin, ".agents/plugins/marketplace.json"), "utf8"),
  );
  assert.equal(
    resolve(plugin, ".agents/plugins", marketplace.plugins[0].source.path),
    plugin,
  );
  const before = readdirSync(plugin, { recursive: true }).sort();
  const result = spawnSync(process.execPath, [executable, "brew"], {
    cwd: plugin,
    input: JSON.stringify({
      prompt: "Draft a note",
      target: "https://github.com/example/coffee-chat",
      snapshots: [
        {
          repository: "https://github.com/example/coffee-chat",
          commit: "1234567890abcdef1234567890abcdef12345678",
          declaration: {
            repository: "https://github.com/example/coffee-chat",
            contract: trustedContract,
            owner: { name: "Example Roaster", url: "https://example.com" },
            contentLicense: {
              spdx: "CC-BY-4.0",
              url: "https://creativecommons.org/licenses/by/4.0/",
            },
            notices: {
              publicBeans: true,
              sharingCommercialAiAdaptations: true,
              attributionLicenseChangesNoEndorsement: true,
              irrevocable: true,
              rightsAuthority: true,
              originExcluded: true,
              aiCoffeeNonAuthorshipNonEndorsement: true,
            },
          },
          beans: [
            {
              uuid: "018f47f6-1234-7abc-8abc-1234567890ab",
              title: "Clear writing",
              content: "Prefer direct language.",
              owner: { name: "Example Roaster", url: "https://example.com" },
            },
          ],
        },
      ],
    }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "ok");
  assert.equal(output.result.receipt.transformation, "ai-generated-from-beans");
  assert.deepEqual(readdirSync(plugin, { recursive: true }).sort(), before);
  rmSync(installation, { recursive: true, force: true });
});
