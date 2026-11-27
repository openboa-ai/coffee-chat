import { applySchemaToPostgres } from "../src/db/client.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is required to run db:migrate against Postgres/Neon.",
    );
    process.exit(1);
  }

  const { statementsApplied } = await applySchemaToPostgres(databaseUrl);
  console.log(
    `Applied ${statementsApplied} idempotent schema & index statements cleanly.`,
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
