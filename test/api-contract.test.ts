import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { databaseUrl, publicConfig } from "../src/server/env.js";
import { poolConfig } from "../src/server/db.js";

afterEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.SUPABASE_URL;
});

describe("public contracts", () => {
  it("public config exposes only publishable values", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_secret";
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_public";
    const config = publicConfig();
    assert.equal(config.stripePublishableKey, "pk_test_public");
    assert.equal(JSON.stringify(config).includes("sk_test_secret"), false);
  });

  it("accepts Postgres URL aliases but not the Supabase API URL", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    assert.equal(databaseUrl(), undefined);

    process.env.POSTGRES_URL = "postgres://postgres:password@db.example.supabase.co:5432/postgres";
    assert.equal(databaseUrl(), process.env.POSTGRES_URL);

    process.env.DATABASE_URL = "postgres://postgres:password@pooler.example.supabase.co:6543/postgres";
    assert.equal(databaseUrl(), process.env.DATABASE_URL);
  });

  it("enables SSL for remote Postgres URLs without changing local URLs", () => {
    assert.equal(poolConfig("postgres://user:pass@localhost:5432/app").ssl, undefined);
    assert.deepEqual(poolConfig("postgres://user:pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres").ssl, { rejectUnauthorized: false });
    assert.equal(poolConfig("postgres://user:pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require").ssl, undefined);
  });
});
