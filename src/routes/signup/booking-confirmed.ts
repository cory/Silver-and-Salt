import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, parseJson, sendJson, HttpError } from "../../server/http.js";
import { markBookingConfirmed, getApplication } from "../../server/repository.js";
import { sendEmail } from "../../server/email.js";
import { getGroup } from "../../server/groups.js";

export default apiHandler("signup.booking_confirmed", async (req: VercelRequest, res: VercelResponse, requestId: string) => {
  method(req, "POST");
  const body = await parseJson<{ applicationId?: string; refundPolicyAccepted?: boolean }>(req);
  if (!body.applicationId) throw new HttpError(400, "application_required", "applicationId is required");
  const app = await getApplication(body.applicationId);
  if (!app) throw new HttpError(404, "application_not_found", "Application not found");
  const updated = await markBookingConfirmed(body.applicationId, body.refundPolicyAccepted === true);
  const group = await getGroup(updated.group_id);
  await sendEmail({
    to: updated.email,
    subject: "Your Silver & Salt Capital conversation is reserved",
    requestId,
    html: `<p>Thank you for reserving your conversation with Silver &amp; Salt Capital.</p><p>${group.community_commitment}</p>`,
  });
  sendJson(res, 200, { ok: true, applicationId: updated.id, status: updated.status });
});
