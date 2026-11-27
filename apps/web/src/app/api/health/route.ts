import { sql } from "drizzle-orm";
import {
  getDbHandle,
  isVercelRuntime,
  jsonNoStore,
} from "@/lib/runtime";

export const dynamic = "force-dynamic";

/**
 * Lightweight runtime health endpoint reporting DB connectivity and schema
 * readiness without exposing credentials, connection strings, or PII.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const mode = hasDatabaseUrl
    ? "postgres"
    : isVercelRuntime()
      ? "preview-memory"
      : "local-disk";

  try {
    const handle = await getDbHandle();
    await handle.db.execute(sql`SELECT 1 AS ok`);
    const tableCheck = await handle.db.execute(
      sql`SELECT to_regclass('public.beans') AS beans_table`,
    );
    const rows =
      (tableCheck as unknown as { rows?: Array<{ beans_table?: string | null }> })
        .rows ?? [];
    const schemaReady = Boolean(rows[0]?.beans_table);

    return jsonNoStore(
      {
        ok: schemaReady,
        driver: handle.driver,
        mode,
        schemaReady,
      },
      { status: schemaReady ? 200 : 503 },
    );
  } catch {
    return jsonNoStore(
      {
        ok: false,
        driver: hasDatabaseUrl ? "neon" : "pglite",
        mode,
        schemaReady: false,
      },
      { status: 503 },
    );
  }
}
