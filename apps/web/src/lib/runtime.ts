import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import {
  CoffeeChatError,
  createDatabase,
  seedDemoCommunityIfEmpty,
  type CoffeeChatDb,
  type DatabaseHandle,
} from "@coffee-chat/core";

const globalKey = "__coffeeChatDbHandle__";

type GlobalWithDb = typeof globalThis & {
  [globalKey]?: Promise<DatabaseHandle>;
};

export interface PgliteRuntimeConfig {
  pgliteDir: string;
  shouldSeedDemo: boolean;
}

export type RuntimeEnv = Record<string, string | undefined>;

export function isVercelRuntime(env: RuntimeEnv = process.env): boolean {
  const flag = env.VERCEL?.trim().toLowerCase();
  return Boolean(flag && flag !== "0" && flag !== "false");
}

/**
 * Resolves local vs serverless UI-preview PGlite settings when DATABASE_URL is
 * unset. On Vercel without DATABASE_URL, uses in-memory PGlite (avoiding EROFS
 * on read-only serverless filesystems) and seeds the demo community unless
 * COFFEE_CHAT_SEED_DEMO=false.
 */
export function resolvePgliteRuntimeConfig(
  env: RuntimeEnv = process.env,
  cwd: string = process.cwd(),
): PgliteRuntimeConfig {
  const onVercel = isVercelRuntime(env);
  const explicitDir = env.COFFEE_CHAT_PGLITE_DIR?.trim();
  const pgliteDir =
    explicitDir || (onVercel ? ":memory:" : resolve(cwd, ".local/pglite"));

  const shouldSeedDemo = onVercel
    ? env.COFFEE_CHAT_SEED_DEMO !== "false"
    : env.NODE_ENV !== "production" && env.COFFEE_CHAT_SEED_DEMO === "true";

  return { pgliteDir, shouldSeedDemo };
}

export async function getDbHandle(): Promise<DatabaseHandle> {
  const g = globalThis as GlobalWithDb;
  if (!g[globalKey]) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && databaseUrl.trim().length > 0) {
      g[globalKey] = createDatabase({ databaseUrl });
    } else {
      const { pgliteDir, shouldSeedDemo } = resolvePgliteRuntimeConfig();
      if (pgliteDir !== ":memory:") {
        mkdirSync(pgliteDir, { recursive: true });
      }
      g[globalKey] = createDatabase({
        pgliteDir: pgliteDir === ":memory:" ? undefined : pgliteDir,
      }).then(async (handle) => {
        if (shouldSeedDemo) {
          await seedDemoCommunityIfEmpty(handle.db);
        }
        return handle;
      });
    }
  }
  return g[globalKey]!;
}

export async function getDb(): Promise<CoffeeChatDb> {
  const handle = await getDbHandle();
  return handle.db;
}

export function setDbHandleForTests(handle: DatabaseHandle | null): void {
  const g = globalThis as GlobalWithDb;
  if (handle) {
    g[globalKey] = Promise.resolve(handle);
  } else {
    delete g[globalKey];
  }
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getAppOrigin(
  request?: Request,
  env: RuntimeEnv = process.env,
): string {
  if (env.NEXT_PUBLIC_APP_URL && env.NEXT_PUBLIC_APP_URL.trim().length > 0) {
    return normalizeOrigin(env.NEXT_PUBLIC_APP_URL);
  }
  if (request) {
    const u = new URL(request.url);
    return u.origin;
  }
  if (
    env.VERCEL_PROJECT_PRODUCTION_URL &&
    env.VERCEL_PROJECT_PRODUCTION_URL.trim().length > 0
  ) {
    return normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  if (env.VERCEL_URL && env.VERCEL_URL.trim().length > 0) {
    return normalizeOrigin(env.VERCEL_URL);
  }
  return "http://localhost:3000";
}

export function getMcpResourceUrl(request?: Request): string {
  return `${getAppOrigin(request)}/api/mcp`;
}

export function jsonNoStore(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof CoffeeChatError) {
    return jsonNoStore(
      {
        error: err.code,
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      { status: err.status },
    );
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return jsonNoStore(
    { error: "INTERNAL_ERROR", code: "INTERNAL_ERROR", message },
    { status: 500 },
  );
}
