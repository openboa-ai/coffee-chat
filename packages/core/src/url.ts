import { CoffeeChatError } from "./types.js";

export interface NormalizedUrlResult {
  normalizedUrl: string;
  fragmentLocator: string | null;
}

/**
 * Normalizes an HTTP(S) URL according to Coffee Chat spec:
 * - Only http: and https: allowed
 * - Rejects embedded username/password credentials
 * - Lowercases scheme and hostname, strips default ports (80/443)
 * - Preserves path and query verbatim
 * - Strips fragment from normalizedUrl and returns it as fragmentLocator
 */
export function normalizeOriginUrl(rawUrl: string): NormalizedUrlResult {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      `Invalid origin URL: "${rawUrl}"`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      `Origin URL must use http or https scheme: "${rawUrl}"`,
    );
  }

  if (parsed.username || parsed.password) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "Origin URL must not contain embedded credentials.",
    );
  }

  const fragmentLocator = parsed.hash ? parsed.hash.slice(1) || null : null;
  parsed.hash = "";

  // Standard URL parser already lowercases protocol/hostname and strips default ports (80/443).
  const normalizedUrl = parsed.toString();

  return { normalizedUrl, fragmentLocator };
}

/**
 * SSRF-safe validation for CIMD client metadata URLs:
 * Must be https, no credentials, non-local, non-private IP literal.
 */
export function assertSafeCimdUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "Invalid CIMD client_id URL.",
    );
  }

  if (parsed.protocol !== "https:") {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "CIMD client_id URL must use https.",
    );
  }

  if (parsed.username || parsed.password) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "CIMD client_id URL must not embed credentials.",
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    isPrivateIpLiteral(host)
  ) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "CIMD client_id URL host is not allowed.",
    );
  }

  return parsed;
}

function isPrivateIpLiteral(host: string): boolean {
  const clean = host.replace(/^\[|\]$/g, "");
  // IPv6 loopback / unique local / link-local
  if (
    clean === "::1" ||
    clean === "::" ||
    clean.startsWith("fc") ||
    clean.startsWith("fd") ||
    clean.startsWith("fe80:")
  ) {
    return true;
  }

  // IPv4 literal check
  const parts = clean.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number) as [number, number, number, number];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  return false;
}
