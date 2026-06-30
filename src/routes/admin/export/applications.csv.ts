import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendText } from "../../../server/http.js";
import { requireAdmin } from "../../../server/auth.js";
import { listApplications } from "../../../server/repository.js";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default apiHandler("admin.export.applications", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  await requireAdmin(req);
  const rows = await listApplications();
  const headers = ["id", "status", "first_name", "last_name", "email", "phone", "state", "referral", "created_at", "approved_at", "stripe_subscription_id"];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell((row as any)[key])).join(","))].join("\n");
  res.setHeader("content-disposition", "attachment; filename=applications.csv");
  sendText(res, 200, `${csv}\n`, "text/csv; charset=utf-8");
});
