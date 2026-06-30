import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { enrichActorFromClerk, hasAdminClaim, requireAdmin, requireActor } from "../src/server/auth.js";

const originalFetch = globalThis.fetch;

function req(headers: Record<string, string>) {
  return { headers, query: {} } as any;
}

describe("auth helpers", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.CLERK_SECRET_KEY;
  });

  it("accepts explicit test actors in tests", async () => {
    const actor = await requireActor(req({ "x-test-user-email": "member@example.com" }));
    assert.equal(actor.email, "member@example.com");
  });

  it("requires explicit admin claims", async () => {
    await assert.rejects(() => requireAdmin(req({ "x-test-user-email": "member@example.com" })), /Admin access/);
    await assert.rejects(() => requireAdmin(req({ "x-test-user-email": "tori@silverandsaltcapital.com" })), /Admin access/);
    const admin = await requireAdmin(req({ "x-test-user-email": "tori@silverandsaltcapital.com", "x-test-admin": "1" }));
    assert.equal(admin.actorType, "admin");
  });

  it("accepts Clerk admin metadata claims", async () => {
    assert.equal(hasAdminClaim({ private_metadata: { role: "admin" } }), true);
    assert.equal(hasAdminClaim({ privateMetadata: { role: "admin" } }), true);
    assert.equal(hasAdminClaim({ roles: ["member", "admin"] }), true);
    assert.equal(hasAdminClaim({ public_metadata: { role: "member" } }), false);
    assert.equal(hasAdminClaim({ public_metadata: { role: "admin" } }), false);
    assert.equal(hasAdminClaim({ unsafe_metadata: { role: "admin" } }), false);
    const admin = await requireAdmin(req({ "x-test-user-email": "member@example.com", "x-test-admin": "1" }));
    assert.equal(admin.actorType, "admin");
  });

  it("enriches token-only Clerk actors from the server-side user lookup", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test_lookup";
    let authorizationHeader: string | undefined;
    globalThis.fetch = (async (url, init) => {
      assert.equal(String(url), "https://api.clerk.com/v1/users/user_123");
      authorizationHeader = typeof init?.headers === "object" ? (init.headers as Record<string, string>).authorization : undefined;
      return new Response(JSON.stringify({
        primary_email_address_id: "email_123",
        email_addresses: [{ id: "email_123", email_address: "Member@Example.com" }],
        private_metadata: { role: "admin" },
      }), { status: 200 });
    }) as typeof fetch;

    const actor = await enrichActorFromClerk({
      actorType: "member",
      clerkUserId: "user_123",
      email: null,
      actorIdHash: null,
      adminClaim: false,
    });

    assert.equal(authorizationHeader, "Bearer sk_test_lookup");
    assert.equal(actor.email, "member@example.com");
    assert.equal(actor.adminClaim, true);
    assert.ok(actor.actorIdHash);
  });
});
