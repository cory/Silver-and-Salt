import pg from "pg";
import { databaseUrl } from "./env.js";
import { traced } from "./tracing.js";

const { Pool } = pg;
let pool: pg.Pool | null = null;

function shouldForceSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    return !localHosts.has(host) && !url.searchParams.has("sslmode");
  } catch {
    return false;
  }
}

export function poolConfig(connectionString: string): pg.PoolConfig {
  const config: pg.PoolConfig = { connectionString, max: 5 };
  if (shouldForceSsl(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = databaseUrl();
    if (!connectionString) throw new Error("Missing required environment variable: DATABASE_URL or POSTGRES_URL");
    pool = new Pool(poolConfig(connectionString));
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
