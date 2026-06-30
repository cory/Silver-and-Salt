import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, parseJson, sendJson, HttpError } from "../../server/http.js";
import { resolveActor } from "../../server/auth.js";
import { findOrAttachMember, insertAccreditation } from "../../server/repository.js";

export default apiHandler("member.accreditation", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "POST");
  const actor = await resolveActor(req);
  const member = await findOrAttachMember({ clerkUserId: actor.clerkUserId, email: actor.email });
  if (!member) throw new HttpError(403, "member_not_approved", "Approved member access required");
  const body = await parseJson<Record<string, unknown>>(req);
  await insertAccreditation({ memberId: member.id, groupId: member.group_id, answers: body });
  sendJson(res, 200, { ok: true });
});
