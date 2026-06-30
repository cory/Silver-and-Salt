import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson, HttpError } from "../../server/http.js";
import { resolveActor } from "../../server/auth.js";
import { findOrAttachMember } from "../../server/repository.js";

export default apiHandler("member.me", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  const actor = await resolveActor(req);
  const member = await findOrAttachMember({ clerkUserId: actor.clerkUserId, email: actor.email });
  if (!member) throw new HttpError(403, "member_not_approved", "This account is not attached to an approved member yet");
  sendJson(res, 200, { member: { id: member.id, email: member.email, status: member.status, approvedAt: member.approved_at } });
});
