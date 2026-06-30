import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson, HttpError } from "../../../../server/http.js";
import { requireAdmin } from "../../../../server/auth.js";
import { approveApplication } from "../../../../server/repository.js";
import { createClerkInvitation } from "../../../../server/clerk.js";
import { sendEmail } from "../../../../server/email.js";

export default apiHandler("admin.applications.approve", async (req: VercelRequest, res: VercelResponse, requestId: string) => {
  method(req, "POST");
  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) throw new HttpError(400, "application_required", "Application id is required");
  const actor = await requireAdmin(req);
  const { application, member } = await approveApplication({ applicationId: id, actorIdHash: actor.actorIdHash });
  await createClerkInvitation(member.email);
  await sendEmail({
    to: member.email,
    subject: "Welcome to Silver & Salt Capital",
    requestId,
    html: `<p>Your Silver &amp; Salt Capital membership has been approved.</p><p>Use the member invitation to finish setting up your account.</p>`,
  });
  sendJson(res, 200, { ok: true, application, member });
});
