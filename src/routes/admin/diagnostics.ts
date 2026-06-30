import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson } from "../../server/http.js";
import { requireAdmin } from "../../server/auth.js";
import { diagnosticsSnapshot } from "../../server/repository.js";

export default apiHandler("admin.diagnostics", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  await requireAdmin(req);
  sendJson(res, 200, await diagnosticsSnapshot());
});
