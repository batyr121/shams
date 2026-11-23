import { Pool } from "pg";
import fs from "node:fs/promises";
try {
  process.loadEnvFile(".env.local");
} catch {}
if (!process.env.DATABASE_URL)
  throw Error("Set DATABASE_URL before applying migrations.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(7843290)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const files = (
    await fs.readdir(new URL("../database/migrations/", import.meta.url))
  )
    .filter((s) => s.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const version = file.slice(0, -4);
    if (
      (
        await client.query("SELECT 1 FROM schema_migrations WHERE version=$1", [
          version,
        ])
      ).rowCount
    )
      continue;
    await client.query(
      await fs.readFile(
        new URL("../database/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
    console.log("Applied migration:", version);
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.query("SELECT pg_advisory_unlock(7843290)");
  client.release();
  await pool.end();
}
