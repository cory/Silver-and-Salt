import { appBaseUrl, optionalEnv, requiredEnv } from "./env.js";
import { traced } from "./tracing.js";

export async function createClerkInvitation(email: string): Promise<void> {
  const secret = optionalEnv("CLERK_SECRET_KEY");
  if (!secret) return;
  const res = await traced("clerk.invitation", { provider: "clerk" }, () => fetch("https://api.clerk.com/v1/invitations", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({
      email_address: email,
      redirect_url: `${appBaseUrl()}/members`,
      ignore_existing: true,
    }),
  }));
  if (!res.ok) throw new Error(`Clerk invitation failed: ${res.status} ${await res.text()}`);
}

export function clerkSecret(): string {
  return requiredEnv("CLERK_SECRET_KEY");
}
