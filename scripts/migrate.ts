import { loadLocalEnv } from "./load-local-env.js";
loadLocalEnv();
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPool } from "../src/server/db.js";
import { nowIso } from "../src/server/ids.js";
import { checkSqlConformance } from "../src/domain/sqlConformance.js";

const root = new URL("..", import.meta.url).pathname;
const migrationsDir = join(root, "migrations");
const pool = getPool();

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  const failures = checkSqlConformance(sql);
  if (failures.length) throw new Error(`${file} violates SQL conformance: ${failures.join(", ")}`);
  const seen = await pool.query(`SELECT id FROM schema_migrations WHERE id = $1`, [file]);
  if (seen.rowCount) continue;
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations (id, applied_at) VALUES ($1,$2)`, [file, nowIso()]);
    await pool.query("COMMIT");
    console.log(`applied ${file}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}
await pool.end();
