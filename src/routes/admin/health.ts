import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson } from "../../server/http.js";
import { requireAdmin } from "../../server/auth.js";
import { healthSnapshot } from "../../server/repository.js";

export default apiHandler("admin.health", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  await requireAdmin(req);
  sendJson(res, 200, await healthSnapshot());
});
