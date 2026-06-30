import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashValue, redactEmail, redactObject } from "../src/server/redact.js";

describe("redaction", () => {
  it("hashes without exposing the original", () => {
    const hash = hashValue("Tori@SilverAndSaltCapital.com");
    assert.equal(typeof hash, "string");
    assert.notEqual(hash, "tori@silverandsaltcapital.com");
  });

  it("redacts common PII fields", () => {
    assert.equal(redactEmail("martha@example.com"), "m***a@example.com");
    assert.deepEqual(redactObject({ email: "martha@example.com", nested: { token: "abc" } }), { email: "[redacted]", nested: { token: "[redacted]" } });
  });
});
