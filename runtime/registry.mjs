import {
  chmodSync,
  closeSync,
  existsSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const CALVER = "2026.8.13";
const SHA = /^[0-9a-f]{40}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const REPOSITORY = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/coffee-chat$/u;
const CONTRACT_REPOSITORY =
  "https://github.com/openboa-ai/coffee-chat-roastery";

export class RegistryError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
  }
}

export function defaultRegistryPath(environment = process.env) {
  if (environment.COFFEE_CHAT_STATE_DIR) {
    return join(environment.COFFEE_CHAT_STATE_DIR, "registry.json");
  }
  if (platform() === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Coffee Chat",
      "registry.json",
    );
  }
  if (platform() === "win32" && environment.LOCALAPPDATA) {
    return join(environment.LOCALAPPDATA, "Coffee Chat", "registry.json");
  }
  return join(
    environment.XDG_STATE_HOME ?? join(homedir(), ".local", "state"),
    "coffee-chat",
    "registry.json",
  );
}

function validRecord(record) {
  return (
    record &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    JSON.stringify(Object.keys(record).sort()) ===
      JSON.stringify(["commit", "contract", "repository", "role"]) &&
    record.role === "owned" &&
    typeof record.repository === "string" &&
    REPOSITORY.test(record.repository) &&
    typeof record.commit === "string" &&
    SHA.test(record.commit) &&
    record.contract &&
    typeof record.contract === "object" &&
    !Array.isArray(record.contract) &&
    JSON.stringify(Object.keys(record.contract).sort()) ===
      JSON.stringify(["commit", "digest", "repository"]) &&
    record.contract.repository === CONTRACT_REPOSITORY &&
    typeof record.contract.commit === "string" &&
    SHA.test(record.contract.commit) &&
    typeof record.contract.digest === "string" &&
    DIGEST.test(record.contract.digest)
  );
}

function readRegistry(path) {
  if (!existsSync(path)) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new RegistryError("invalid_registry");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    JSON.stringify(Object.keys(parsed).sort()) !==
      JSON.stringify(["calver", "owned"]) ||
    parsed.calver !== CALVER ||
    !validRecord(parsed.owned)
  ) {
    throw new RegistryError("invalid_registry");
  }
  return parsed;
}

function writeNewRegistry(path, record) {
  const parent = dirname(path);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const temporary = join(
    parent,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let descriptor;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(
      descriptor,
      `${JSON.stringify({ calver: CALVER, owned: record }, null, 2)}\n`,
      "utf8",
    );
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temporary, path);
    chmodSync(path, 0o600);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EEXIST" || error.code === "EISDIR")
    ) {
      throw new RegistryError("owned_registration_exists");
    }
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    rmSync(temporary, { force: true });
  }
}

export function createOwnedRegistry({ path = defaultRegistryPath() } = {}) {
  return {
    async preflightOwned(preview) {
      const repository = preview?.target?.repository;
      if (typeof repository !== "string" || !REPOSITORY.test(repository)) {
        return { status: "failed", code: "invalid_owned_repository" };
      }
      try {
        if (readRegistry(path)) {
          return { status: "failed", code: "owned_registration_exists" };
        }
      } catch (error) {
        return {
          status: "failed",
          code:
            error instanceof RegistryError ? error.code : "invalid_registry",
        };
      }
      return { status: "ready", repository };
    },

    async registerOwned(record) {
      if (!validRecord(record)) throw new RegistryError("invalid_owned_record");
      if (readRegistry(path)) {
        throw new RegistryError("owned_registration_exists");
      }
      writeNewRegistry(path, record);
      return { status: "registered", record };
    },
  };
}
