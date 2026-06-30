import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson } from "../../server/http.js";
import { requireCron } from "../../server/auth.js";
import { addHealthCheck } from "../../server/repository.js";

export default apiHandler("cron.reconcile_stripe", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  requireCron(req);
  // V1 reconciliation records heartbeat health. Deep Stripe subscription diffing is
  // intentionally code-owned and should be expanded once production Stripe IDs exist.
  await addHealthCheck("stripe_reconciliation", "green", "Stripe reconciliation job completed", { mode: "heartbeat" });
  sendJson(res, 200, { ok: true });
});
