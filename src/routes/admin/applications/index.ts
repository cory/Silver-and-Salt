import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson } from "../../../server/http.js";
import { requireAdmin } from "../../../server/auth.js";
import { listApplications } from "../../../server/repository.js";

export default apiHandler("admin.applications.list", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  await requireAdmin(req);
  const applications = await listApplications();
  sendJson(res, 200, { applications });
});
