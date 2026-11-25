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

export async function getDbHandle(): Promise<DatabaseHandle> {
  const g = globalThis as GlobalWithDb;
  if (!g[globalKey]) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && databaseUrl.trim().length > 0) {
      g[globalKey] = createDatabase({ databaseUrl });
    } else {
      const pgliteDir =
        process.env.COFFEE_CHAT_PGLITE_DIR ||
        resolve(process.cwd(), ".local/pglite");
      if (pgliteDir !== ":memory:") {
        mkdirSync(pgliteDir, { recursive: true });
      }
      g[globalKey] = createDatabase({
        pgliteDir: pgliteDir === ":memory:" ? undefined : pgliteDir,
      }).then(async (handle) => {
        if (
          process.env.NODE_ENV !== "production" &&
          process.env.COFFEE_CHAT_SEED_DEMO === "true"
        ) {
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

export function getAppOrigin(request?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (request) {
    const u = new URL(request.url);
    return u.origin;
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
