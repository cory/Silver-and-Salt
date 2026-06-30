import { createHmac, timingSafeEqual } from "node:crypto";
import { optionalEnv, requiredEnv } from "./env.js";
import { traced } from "./tracing.js";

export class StripeError extends Error {}

function encodeForm(obj: unknown, prefix = "", out = new URLSearchParams()): URLSearchParams {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") {
    out.append(prefix, String(obj));
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((value, i) => encodeForm(value, `${prefix}[${i}]`, out));
    return out;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    encodeForm(value, prefix ? `${prefix}[${key}]` : key, out);
  }
  return out;
}

export function stripeConfigured(): boolean {
  return !!optionalEnv("STRIPE_SECRET_KEY") && !!optionalEnv("STRIPE_PUBLISHABLE_KEY");
}

export async function stripeRequest(path: string, opts: { method?: string; body?: Record<string, unknown>; idempotencyKey?: string } = {}): Promise<any> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${requiredEnv("STRIPE_SECRET_KEY")}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  const init: RequestInit = { method: opts.method ?? "POST", headers };
  if (opts.body) init.body = encodeForm(opts.body).toString();
  const res = await traced("stripe.request", { "stripe.path": path, "http.method": init.method ?? "POST" }, () => fetch(`https://api.stripe.com/v1/${path}`, init));
  const json = await res.json();
  if (!res.ok) throw new StripeError(`stripe ${path}: ${JSON.stringify(json)}`);
  return json;
}

export async function createCustomer(args: { email: string; name: string; applicationId: string; groupId: string }): Promise<any> {
  return stripeRequest("customers", {
    idempotencyKey: `customer:${args.applicationId}`,
    body: { email: args.email, name: args.name, metadata: { applicationId: args.applicationId, groupId: args.groupId } },
  });
}

export async function createIncompleteSubscription(args: {
  customerId: string;
  priceId: string;
  applicationId: string;
  groupId: string;
  email: string;
  referralCode?: string | null;
}): Promise<any> {
  return stripeRequest("subscriptions", {
    idempotencyKey: `subscription:${args.applicationId}`,
    body: {
      customer: args.customerId,
      items: [{ price: args.priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        applicationId: args.applicationId,
        groupId: args.groupId,
        email: args.email,
        referralCode: args.referralCode ?? "",
      },
    },
  });
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | undefined, secret: string, toleranceSec = 300): StripeEvent {
  if (!signatureHeader) throw new StripeError("missing stripe-signature header");
  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const index = part.indexOf("=");
    if (index === -1) return acc;
    const key = part.slice(0, index);
    const value = part.slice(index + 1);
    acc[key] = [...(acc[key] ?? []), value];
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) throw new StripeError("malformed stripe-signature header");
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) throw new StripeError("stripe signature timestamp outside tolerance");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const matched = signatures.some((sig) => {
    const actual = Buffer.from(sig, "hex");
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });
  if (!matched) throw new StripeError("stripe signature mismatch");
  return JSON.parse(rawBody) as StripeEvent;
}

export function signStripeFixture(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}
