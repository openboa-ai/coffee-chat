import { readFileSync } from "node:fs";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export const capabilityContract = deepFreeze(
  JSON.parse(
    readFileSync(
      new URL("../config/capabilities.json", import.meta.url),
      "utf8",
    ),
  ),
);

export const calver = capabilityContract.calver;
export const capabilityDefinitions = capabilityContract.capabilities;
export const capabilities = Object.freeze(
  capabilityDefinitions.map(({ id }) => id),
);
export const skillNames = Object.freeze(
  Object.fromEntries(capabilityDefinitions.map(({ id, skill }) => [id, skill])),
);
