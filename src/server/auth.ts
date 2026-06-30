import type { VercelRequest } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { optionalEnv } from "./env.js";
import { HttpError } from "./http.js";
import { actorHash } from "./logger.js";

export interface Actor {
  actorType: "member" | "admin";
  clerkUserId: string;
  email: string | null;
  actorIdHash: string | null;
  adminClaim: boolean;
}

export interface ClerkUserDetails {
  email: string | null;
  adminClaim: boolean;
  fetchAttempted: boolean;
  fetchOk: boolean;
  fetchStatus: number | null;
  errorCode: string | null;
}

function claimObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function hasAdminValue(value: unknown): boolean {
  if (typeof value === "string") return value.toLowerCase() === "admin";
  if (Array.isArray(value)) return value.some((item) => hasAdminValue(item));
  return false;
}

function metadataHasAdmin(value: unknown): boolean {
  const metadata = claimObject(value);
  if (!metadata) return false;
  return metadata.admin === true
    || metadata.is_admin === true
    || metadata.isAdmin === true
    || hasAdminValue(metadata.role)
    || hasAdminValue(metadata.roles);
}

export function hasAdminClaim(payload: Record<string, unknown>): boolean {
  return payload.admin === true
    || payload.is_admin === true
    || payload.isAdmin === true
    || hasAdminValue(payload.role)
    || hasAdminValue(payload.roles)
    || metadataHasAdmin(payload.private_metadata)
    || metadataHasAdmin(payload.privateMetadata);
}

export async function loadClerkUserDetails(clerkUserId: string): Promise<ClerkUserDetails> {
  if (clerkUserId.startsWith("test:")) return { email: null, adminClaim: false, fetchAttempted: false, fetchOk: false, fetchStatus: null, errorCode: "test_actor" };
  const secret = optionalEnv("CLERK_SECRET_KEY");
  if (!secret) return { email: null, adminClaim: false, fetchAttempted: false, fetchOk: false, fetchStatus: null, errorCode: "clerk_secret_missing" };
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!response.ok) {
      return { email: null, adminClaim: false, fetchAttempted: true, fetchOk: false, fetchStatus: response.status, errorCode: "clerk_user_fetch_failed" };
    }
    const user = await response.json() as Record<string, unknown>;
    const emails = Array.isArray(user.email_addresses) ? user.email_addresses as Array<Record<string, unknown>> : [];
    const primaryId = typeof user.primary_email_address_id === "string" ? user.primary_email_address_id : null;
    const primaryEmail = emails.find((email) => email.id === primaryId) ?? emails[0];
    const emailValue = primaryEmail && typeof primaryEmail.email_address === "string" ? primaryEmail.email_address.toLowerCase() : null;
    return { email: emailValue, adminClaim: hasAdminClaim(user), fetchAttempted: true, fetchOk: true, fetchStatus: response.status, errorCode: null };
  } catch {
    return { email: null, adminClaim: false, fetchAttempted: true, fetchOk: false, fetchStatus: null, errorCode: "clerk_user_fetch_error" };
  }
}

export async function enrichActorFromClerk(actor: Actor): Promise<Actor> {
  const details = await loadClerkUserDetails(actor.clerkUserId);
  if (!details.fetchOk) return actor;
  const email = actor.email ?? details.email;
  return {
    ...actor,
    email,
    actorIdHash: actor.email ? actor.actorIdHash : actorHash(email ?? actor.clerkUserId),
    adminClaim: actor.adminClaim || details.adminClaim,
  };
}

export function actorIsAdmin(actor: Actor): boolean {
  return actor.adminClaim;
}

export async function resolveActor(req: VercelRequest): Promise<Actor> {
  return enrichActorFromClerk(await requireActor(req));
}

function bearer(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice("bearer ".length).trim();
}

function testActor(req: VercelRequest): Actor | null {
  const allow = process.env.NODE_ENV === "test" || optionalEnv("ALLOW_TEST_AUTH_HEADER") === "1";
  if (!allow) return null;
  const email = req.headers["x-test-user-email"];
  if (typeof email !== "string" || !email) return null;
  return {
    actorType: "member",
    clerkUserId: `test:${email}`,
    email: email.toLowerCase(),
    actorIdHash: actorHash(email),
    adminClaim: req.headers["x-test-admin"] === "1",
  };
}

export async function requireActor(req: VercelRequest): Promise<Actor> {
  const test = testActor(req);
  if (test) return test;
  const token = bearer(req);
  if (!token) throw new HttpError(401, "auth_required", "Sign in required");
  const payload = await verifyToken(token, { secretKey: optionalEnv("CLERK_SECRET_KEY") } as any);
  const sub = String(payload.sub ?? "");
  if (!sub) throw new HttpError(401, "invalid_token", "Invalid Clerk token");
  const emailClaim = payload.email ?? payload.email_address ?? payload.primary_email_address;
  const email = typeof emailClaim === "string" ? emailClaim.toLowerCase() : null;
  return { actorType: "member", clerkUserId: sub, email, actorIdHash: actorHash(email ?? sub), adminClaim: hasAdminClaim(payload as Record<string, unknown>) };
}

export async function requireAdmin(req: VercelRequest): Promise<Actor> {
  const actor = await resolveActor(req);
  if (!actorIsAdmin(actor)) {
    throw new HttpError(403, "admin_required", "Admin access required");
  }
  return { ...actor, actorType: "admin" };
}

export function requireCron(req: VercelRequest): void {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret) throw new HttpError(500, "cron_secret_missing", "CRON_SECRET is not configured");
  const header = req.headers.authorization;
  const querySecret = typeof req.query.secret === "string" ? req.query.secret : null;
  if (header !== `Bearer ${secret}` && querySecret !== secret) throw new HttpError(401, "cron_unauthorized", "Cron secret required");
}
