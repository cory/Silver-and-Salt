import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler, method, sendJson, HttpError } from "../../server/http.js";
import { actorIsAdmin, resolveActor } from "../../server/auth.js";
import { findOrAttachMember } from "../../server/repository.js";

export default apiHandler("member.content", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  const actor = await resolveActor(req);
  const member = await findOrAttachMember({ clerkUserId: actor.clerkUserId, email: actor.email });
  const adminPreview = !member && actorIsAdmin(actor);
  if (!member && !adminPreview) throw new HttpError(403, "member_not_approved", "Approved member access required");
  sendJson(res, 200, {
    welcome: adminPreview ? "Member resource preview." : "You're in. Let's get you set up.",
    preview: adminPreview,
    tasks: [
      { title: "Add Silver & Salt Capital to your LinkedIn", href: "#linkedin", description: "A quick guide with two ways to add it and copy-ready descriptions." },
      { title: "Tell your network you've joined", href: "#announcement", description: "A ready-to-post announcement and branded share-image workflow." },
      { title: "Complete your accreditation profile", href: "#accreditation", description: "Kept separate from membership status and visible only to approved member/admin workflows." },
    ],
  });
});
