import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSqlConformance } from "../src/domain/sqlConformance.js";

const migrationsDir = join(process.cwd(), "migrations");

describe("SQL conformance", () => {
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"))) {
    it(`${file} has no database-side business behavior`, () => {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      assert.deepEqual(checkSqlConformance(sql), []);
    });
  }

  it("detects forbidden database functions", () => {
    assert.ok(checkSqlConformance("CREATE FUNCTION do_work() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;").length > 0);
  });
});
