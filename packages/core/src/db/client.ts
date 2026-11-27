import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema.js";
import { SCHEMA_DDL } from "./sql.js";

export type CoffeeChatDb = PgliteDatabase<typeof schema>;

export interface DatabaseHandle {
  db: CoffeeChatDb;
  driver: "pglite" | "neon";
  close: () => Promise<void>;
}

/**
 * Splits SCHEMA_DDL into ordered executable SQL statements for Postgres drivers
 * (Neon Pool / pg) that accept one statement per query call.
 */
export function splitSqlStatements(ddl: string): string[] {
  return ddl
    .split(/;\s*(?:\r?\n|$)/)
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));
}

/**
 * Applies the idempotent Coffee Chat Postgres DDL (`CREATE TABLE/INDEX IF NOT EXISTS`)
 * against a remote Neon/Postgres database inside a single transaction.
 */
export async function applySchemaToPostgres(
  databaseUrl: string,
): Promise<{ statementsApplied: number }> {
  const statements = splitSqlStatements(SCHEMA_DDL);
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query("COMMIT");
    return { statementsApplied: statements.length };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function createDatabase(options?: {
  databaseUrl?: string;
  pgliteDir?: string;
}): Promise<DatabaseHandle> {
  const url = options?.databaseUrl ?? process.env.DATABASE_URL;

  if (url && url.trim().length > 0) {
    // Use WebSocket-backed Neon Pool (drizzle-orm/neon-serverless) rather than neon-http
    // so all interactive db.transaction() calls in beans.ts and oauth.ts execute atomically.
    const pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    const db = drizzleNeon(pool, { schema }) as unknown as CoffeeChatDb;
    return {
      db,
      driver: "neon",
      close: async () => {
        await pool.end();
      },
    };
  }

  const pglite = options?.pgliteDir
    ? new PGlite(options.pgliteDir)
    : new PGlite();
  await pglite.waitReady;
  await pglite.exec(SCHEMA_DDL);

  const db = drizzlePglite(pglite, { schema });
  return {
    db,
    driver: "pglite",
    close: async () => {
      await pglite.close();
    },
  };
}
