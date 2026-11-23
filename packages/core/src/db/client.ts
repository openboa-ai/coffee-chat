import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema.js";
import { SCHEMA_DDL } from "./sql.js";

export type CoffeeChatDb = PgliteDatabase<typeof schema>;

export interface DatabaseHandle {
  db: CoffeeChatDb;
  driver: "pglite" | "neon";
  close: () => Promise<void>;
}

export async function createDatabase(options?: {
  databaseUrl?: string;
  pgliteDir?: string;
}): Promise<DatabaseHandle> {
  const url = options?.databaseUrl ?? process.env.DATABASE_URL;

  if (url && url.trim().length > 0) {
    const sqlClient = neon(url);
    const db = drizzleNeon(sqlClient, { schema }) as unknown as CoffeeChatDb;
    return {
      db,
      driver: "neon",
      close: async () => {},
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
