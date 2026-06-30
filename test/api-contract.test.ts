import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publicConfig } from "../src/server/env.js";

describe("public contracts", () => {
  it("public config exposes only publishable values", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_secret";
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_public";
    const config = publicConfig();
    assert.equal(config.stripePublishableKey, "pk_test_public");
    assert.equal(JSON.stringify(config).includes("sk_test_secret"), false);
  });
});
