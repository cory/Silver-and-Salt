import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signStripeFixture, verifyStripeWebhook } from "../src/server/stripe.js";

describe("stripe webhook signatures", () => {
  it("accepts a signed fixture", () => {
    const raw = JSON.stringify({ id: "evt_test", type: "invoice.paid", data: { object: {} } });
    const sig = signStripeFixture(raw, "whsec_test", Math.floor(Date.now() / 1000));
    const event = verifyStripeWebhook(raw, sig, "whsec_test");
    assert.equal(event.id, "evt_test");
  });

  it("rejects tampering", () => {
    const raw = JSON.stringify({ id: "evt_test", type: "invoice.paid", data: { object: {} } });
    const sig = signStripeFixture(raw, "whsec_test", Math.floor(Date.now() / 1000));
    assert.throws(() => verifyStripeWebhook(raw.replace("invoice.paid", "charge.refunded"), sig, "whsec_test"), /mismatch/);
  });
});
