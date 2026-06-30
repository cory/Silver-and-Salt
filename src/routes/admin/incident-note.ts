import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, parseJson, sendJson, HttpError } from "../../server/http.js";
import { requireAdmin } from "../../server/auth.js";
import { recordAudit } from "../../server/audit.js";

export default apiHandler("admin.incident_note", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "POST");
  const actor = await requireAdmin(req);
  const body = await parseJson<{ summary?: string; applicationId?: string; component?: string }>(req);
  if (!body.summary || body.summary.trim().length < 3) throw new HttpError(400, "summary_required", "Incident note summary is required");
  await recordAudit({
    actorType: "admin",
    actorIdHash: actor.actorIdHash,
    applicationId: body.applicationId ?? null,
    eventType: "admin.incident_note",
    summary: body.summary.trim(),
    metadata: { component: body.component ?? null },
  });
  sendJson(res, 200, { ok: true });
});
