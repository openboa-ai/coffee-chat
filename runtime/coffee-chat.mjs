#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export const capabilities = Object.freeze([
  "init",
  "sync",
  "unsync",
  "roast",
  "brew",
  "coffee-chat",
  "coffee-blend",
]);

export const skillNames = Object.freeze({
  init: "coffee-init",
  sync: "coffee-sync",
  unsync: "coffee-unsync",
  roast: "coffee-roast",
  brew: "coffee-brew",
  "coffee-chat": "coffee-chat",
  "coffee-blend": "coffee-blend",
});

const capabilitySet = new Set(capabilities);

export function dispatch(capability) {
  if (!capabilitySet.has(capability)) {
    return {
      schema: "coffee-chat-capability-result",
      calver: "2026.8.13",
      capability,
      status: "invalid_capability",
      allowedCapabilities: capabilities,
    };
  }

  if (capability === "init") {
    return {
      schema: "coffee-chat-capability-result",
      calver: "2026.8.13",
      capability,
      status: "available",
      workflow: "preview_then_explicit_apply",
      entrypoint: "skills/coffee-init/scripts/run.mjs",
      writesOnlyAfterAcceptedPreview: true,
    };
  }

  return {
    schema: "coffee-chat-capability-result",
    calver: "2026.8.13",
    capability,
    status: "not_implemented",
    implementationOwner: "later capability Goal",
    sideEffects: {
      network: false,
      filesystem: false,
      git: false,
      github: false,
      registry: false,
      cache: false,
      publication: false,
    },
  };
}

export function runCapabilityCli(
  capability,
  { stdout = process.stdout, stderr = process.stderr } = {},
) {
  const result = dispatch(capability);
  const output = `${JSON.stringify(result)}\n`;
  if (result.status === "not_implemented" || result.status === "available") {
    stdout.write(output);
    return result.status === "available" ? 0 : 3;
  }
  stderr.write(output);
  return 64;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = runCapabilityCli(process.argv[2]);
}
