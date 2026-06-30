import { optionalEnv } from "./env.js";
import { logEvent } from "./logger.js";
import { traced } from "./tracing.js";

export async function sendEmail(args: { to: string; subject: string; html: string; text?: string; requestId?: string }): Promise<void> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("EMAIL_FROM") ?? "Silver & Salt Capital <hello@silverandsaltcapital.com>";
  if (!apiKey) {
    logEvent({ ...(args.requestId ? { requestId: args.requestId } : {}), actorType: "system", operation: "email.skipped", status: "ok", detail: { to: args.to, subject: args.subject } });
    return;
  }
  const res = await traced("email.send", { provider: "resend" }, () => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html, text: args.text }),
  }));
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}
