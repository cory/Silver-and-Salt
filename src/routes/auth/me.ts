import type { VercelRequest, VercelResponse } from "@vercel/node";
import { actorIsAdmin, resolveActor } from "../../server/auth.js";
import { apiHandler, method, sendJson } from "../../server/http.js";
import { findOrAttachMember } from "../../server/repository.js";

export default apiHandler("auth.me", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  const actor = await resolveActor(req);
  const member = await findOrAttachMember({ clerkUserId: actor.clerkUserId, email: actor.email });
  sendJson(res, 200, {
    signedIn: true,
    email: actor.email,
    admin: actorIsAdmin(actor),
    member: member ? { approved: member.status === "active", status: member.status, approvedAt: member.approved_at } : { approved: false, status: null, approvedAt: null },
  });
});
