import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, sendJson } from "../server/http.js";
import { databaseUrl, optionalEnv } from "../server/env.js";
import { query } from "../server/db.js";

export default apiHandler("health", async (_req: VercelRequest, res: VercelResponse) => {
  let database: "ok" | "missing" | "error" = databaseUrl() ? "ok" : "missing";
  if (database === "ok") {
    try { await query("SELECT 1 AS ok"); } catch { database = "error"; }
  }
  const supabaseApiOnly = database === "missing" && Boolean(optionalEnv("SUPABASE_URL"));
  sendJson(res, database === "error" ? 503 : 200, {
    ok: database !== "error",
    service: "silver-salt-vercel",
    database,
    databaseHint: supabaseApiOnly ? "SUPABASE_URL is configured, but a Postgres connection string is required as DATABASE_URL or POSTGRES_URL." : null,
    clerk: optionalEnv("CLERK_SECRET_KEY") ? "configured" : "missing",
    stripe: optionalEnv("STRIPE_SECRET_KEY") ? "configured" : "missing",
    email: optionalEnv("RESEND_API_KEY") ? "configured" : "missing",
    time: new Date().toISOString(),
  });
});
