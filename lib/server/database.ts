import { Pool, PoolClient, QueryResultRow } from "pg";
const globalDb = globalThis as unknown as { ballPool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL)
    throw new HttpError(
      503,
      "PostgreSQL is not configured. Set DATABASE_URL on the server.",
    );
  if (globalDb.ballPool) return globalDb.ballPool;
  const databasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
  });
  databasePool.on("error", (error) =>
    console.error("PostgreSQL idle connection:", error.message),
  );
  globalDb.ballPool = databasePool;
  return databasePool;
}
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  return pool().query<T>(sql, values);
}
export async function transaction<T>(fn: (c: PoolClient) => Promise<T>) {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function failure(e: unknown) {
  if (e instanceof HttpError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error(
    "Backend error",
    e instanceof Error ? e.message : "Unknown error",
  );
  return Response.json(
    {
      error: "The server could not complete this operation. Please try again.",
    },
    { status: 500 },
  );
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
