export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export function requiredEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function csvEnv(name: string): string[] {
  return (optionalEnv(name) ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function appBaseUrl(): string {
  const configured = optionalEnv("APP_BASE_URL");
  if (configured) return configured;
  const vercelUrl = optionalEnv("VERCEL_URL");
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

export const DEFAULT_GROUP_ID = "silver-salt-capital";

function localRuntimeEnabled(): boolean {
  const base = optionalEnv("APP_BASE_URL") ?? (optionalEnv("VERCEL_URL") ? `https://${optionalEnv("VERCEL_URL")}` : "http://localhost:3000");
  return process.env.NODE_ENV === "test" || base.startsWith("http://localhost") || base.startsWith("http://127.0.0.1");
}

export function localTestHarnessEnabled(): boolean {
  return localRuntimeEnabled() && optionalEnv("ALLOW_TEST_AUTH_HEADER") === "1";
}

export function mockSignupEnabled(): boolean {
  return localRuntimeEnabled() && optionalEnv("ENABLE_MOCK_SIGNUP") === "1";
}

export function publicConfig() {
  const localHarness = localTestHarnessEnabled();
  return {
    clerkPublishableKey: optionalEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") ?? optionalEnv("CLERK_PUBLISHABLE_KEY") ?? null,
    stripePublishableKey: optionalEnv("STRIPE_PUBLISHABLE_KEY") ?? null,
    groupId: DEFAULT_GROUP_ID,
    localTestAuthEmail: localHarness ? optionalEnv("LOCAL_TEST_AUTH_EMAIL") ?? "tori@silverandsaltcapital.com" : null,
    mockSignup: mockSignupEnabled(),
  };
}
