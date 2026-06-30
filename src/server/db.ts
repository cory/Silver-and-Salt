import pg from "pg";
import { requiredEnv } from "./env.js";
import { traced } from "./tracing.js";

const { Pool } = pg;
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: requiredEnv("DATABASE_URL"), max: 5 });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return traced("db.query", { "db.system": "postgresql" }, () => getPool().query<T>(text, values as unknown[]));
}

export async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
