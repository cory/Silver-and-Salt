import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, sendJson } from "../server/http.js";
import { databaseUrl, optionalEnv } from "../server/env.js";
import { query } from "../server/db.js";

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : null;
}

function databaseErrorHint(error: unknown): { code: string; hint: string } {
  const code = errorCode(error);
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (code === "28P01" || message.includes("password authentication failed")) {
    return { code: "auth_failed", hint: "Check the Supabase database password, replace any password placeholder, and URL-encode special characters." };
  }
  if (code === "3D000" || message.includes("database") && message.includes("does not exist")) {
    return { code: "database_not_found", hint: "Use the Supabase connection string database name, usually /postgres." };
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return { code: "host_not_found", hint: "Check that the database host was copied from the Supabase Postgres connection string." };
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENETUNREACH" || message.includes("network is unreachable")) {
    return { code: "network_unreachable", hint: "Use the Supabase transaction pooler connection string for Vercel, typically port 6543." };
  }
  if (message.includes("ssl") || message.includes("no pg_hba.conf")) {
    return { code: "ssl_required", hint: "Use the Supabase pooled Postgres connection string and include sslmode=require if Supabase shows it." };
  }
  if (code === "28000" || message.includes("tenant") || message.includes("invalid_authorization_specification")) {
    return { code: "authorization_failed", hint: "For the Supabase pooler, confirm the username uses the pooler format shown by Supabase, often postgres.<project-ref>." };
  }
  return { code: code ?? "connection_failed", hint: "Check the Supabase Postgres connection string, password, pooler mode, and Vercel environment." };
}

export default apiHandler("health", async (_req: VercelRequest, res: VercelResponse) => {
  let database: "ok" | "missing" | "error" = databaseUrl() ? "ok" : "missing";
  let databaseError: { code: string; hint: string } | null = null;
  if (database === "ok") {
    try {
      await query("SELECT 1 AS ok");
    } catch (error) {
      database = "error";
      databaseError = databaseErrorHint(error);
    }
  }
  const supabaseApiOnly = database === "missing" && Boolean(optionalEnv("SUPABASE_URL"));
  sendJson(res, database === "error" ? 503 : 200, {
    ok: database !== "error",
    service: "silver-salt-vercel",
    database,
    databaseError,
    databaseHint: supabaseApiOnly ? "SUPABASE_URL is configured, but a Postgres connection string is required as DATABASE_URL or POSTGRES_URL." : null,
    clerk: optionalEnv("CLERK_SECRET_KEY") ? "configured" : "missing",
    stripe: optionalEnv("STRIPE_SECRET_KEY") ? "configured" : "missing",
    email: optionalEnv("RESEND_API_KEY") ? "configured" : "missing",
    time: new Date().toISOString(),
  });
});
