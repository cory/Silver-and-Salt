import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canTransition, assertTransition } from "../src/domain/status.js";
import { foundingMemberPrice, formatUsd } from "../src/domain/pricing.js";
import { validateSignupStart } from "../src/contracts/signup.js";

const valid = {
  firstName: "Martha",
  lastName: "Cannon",
  email: "martha@example.com",
  phone: "801-555-1212",
  state: "UT",
  referral: "linkedin",
  message: "I would like to join.",
  disclaimerAccepted: true,
};

describe("domain rules", () => {
  it("keeps pricing code-owned", () => {
    const price = foundingMemberPrice();
    assert.equal(price.standardAmountCents, 100000);
    assert.equal(price.foundingDiscountCents, 10000);
    assert.equal(price.dueTodayCents, 90000);
    assert.equal(formatUsd(price.dueTodayCents), "$900.00");
  });

  it("validates signup input", () => {
    assert.equal(validateSignupStart(valid).email, "martha@example.com");
    assert.throws(() => validateSignupStart({ ...valid, disclaimerAccepted: false }), /disclaimer/);
  });

  it("allows only explicit application transitions", () => {
    assert.equal(canTransition("pending_payment", "paid_pending_vetting"), true);
    assert.equal(canTransition("pending_payment", "approved"), false);
    assert.throws(() => assertTransition("refunded", "approved"));
  });
});
