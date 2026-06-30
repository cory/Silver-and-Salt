import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, sendJson } from "../server/http.js";
import { optionalEnv } from "../server/env.js";
import { query } from "../server/db.js";

export default apiHandler("health", async (_req: VercelRequest, res: VercelResponse) => {
  let database: "ok" | "missing" | "error" = optionalEnv("DATABASE_URL") ? "ok" : "missing";
  if (database === "ok") {
    try { await query("SELECT 1 AS ok"); } catch { database = "error"; }
  }
  sendJson(res, database === "error" ? 503 : 200, {
    ok: database !== "error",
    service: "silver-salt-vercel",
    database,
    clerk: optionalEnv("CLERK_SECRET_KEY") ? "configured" : "missing",
    stripe: optionalEnv("STRIPE_SECRET_KEY") ? "configured" : "missing",
    email: optionalEnv("RESEND_API_KEY") ? "configured" : "missing",
    time: new Date().toISOString(),
  });
});
