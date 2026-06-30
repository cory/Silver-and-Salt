import { createHash } from "node:crypto";

export function hashValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex").slice(0, 16);
}

export function redactEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [name = "", domain = ""] = email.toLowerCase().split("@");
  if (!domain) return "[redacted]";
  const safeName = name.length <= 2 ? "**" : `${name.slice(0, 1)}***${name.slice(-1)}`;
  return `${safeName}@${domain}`;
}

const SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "firstName",
  "lastName",
  "message",
  "address",
  "token",
  "secret",
  "authorization",
  "stripeSignature",
  "rawBody",
  "accreditationAnswers",
]);

export function redactObject(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactObject);
  if (!input || typeof input !== "object") return input;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || /secret|token|password|authorization/i.test(key)) {
      out[key] = "[redacted]";
    } else if (/email/i.test(key) && typeof value === "string") {
      out[key] = redactEmail(value);
    } else {
      out[key] = redactObject(value);
    }
  }
  return out;
}
