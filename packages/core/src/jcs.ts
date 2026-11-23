import { createHash } from "node:crypto";

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) serializer.
 * Sorts object keys by UTF-16 code units, serializes finite numbers per ES2015+,
 * and emits compact JSON without extraneous whitespace.
 */
export function canonicalizeJcs(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;

  if (type === "boolean") {
    return value ? "true" : "false";
  }

  if (type === "number") {
    const num = value as number;
    if (!Number.isFinite(num)) {
      throw new Error("RFC 8785 JCS does not permit non-finite numbers.");
    }
    return Object.is(num, -0) ? "0" : String(num);
  }

  if (type === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) =>
      item === undefined ? "null" : canonicalizeJcs(item),
    );
    return `[${items.join(",")}]`;
  }

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    const parts = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalizeJcs(obj[k])}`,
    );
    return `{${parts.join(",")}}`;
  }

  throw new Error(`Unsupported value type for JCS canonicalization: ${type}`);
}

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function computeJcsDigest(payload: unknown): {
  canonicalJson: string;
  digest: string;
} {
  const canonicalJson = canonicalizeJcs(payload);
  return {
    canonicalJson,
    digest: sha256Hex(Buffer.from(canonicalJson, "utf8")),
  };
}
