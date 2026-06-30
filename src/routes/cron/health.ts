import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson } from "../../server/http.js";
import { requireCron } from "../../server/auth.js";
import { addHealthCheck, healthSnapshot } from "../../server/repository.js";

export default apiHandler("cron.health", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  requireCron(req);
  const snapshot = await healthSnapshot();
  const staleWebhook = snapshot.lastWebhookAt ? Date.now() - Date.parse(snapshot.lastWebhookAt) > 1000 * 60 * 60 * 24 * 7 : true;
  await addHealthCheck("webhook_freshness", staleWebhook ? "amber" : "green", staleWebhook ? "No recent Stripe webhook activity" : "Stripe webhook activity is fresh", { lastWebhookAt: snapshot.lastWebhookAt });
  await addHealthCheck("paid_pending_vetting", snapshot.paidPendingVettingCount > 10 ? "amber" : "green", `${snapshot.paidPendingVettingCount} paid applications pending vetting`, { count: snapshot.paidPendingVettingCount });
  sendJson(res, 200, { ok: true, snapshot });
});
