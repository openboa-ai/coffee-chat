import { createHash } from "node:crypto";

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function digest(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function normalizeRepository(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new TypeError(
      "Roastery repositories must use a public https://github.com URL.",
    );
  }
  const parts = url.pathname
    .replace(/\/+$/u, "")
    .replace(/\.git$/u, "")
    .split("/")
    .filter(Boolean);
  if (parts.length !== 2)
    throw new TypeError("Roastery URL must identify one GitHub repository.");
  return `https://github.com/${parts[0].toLowerCase()}/${parts[1].toLowerCase()}`;
}
