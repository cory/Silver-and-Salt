import type { VercelRequest, VercelResponse } from "@vercel/node";
import { actorIsAdmin, loadClerkUserDetails, requireActor } from "../../server/auth.js";
import { optionalEnv } from "../../server/env.js";
import { apiHandler, method, sendJson } from "../../server/http.js";
import { findMemberForActor } from "../../server/repository.js";

export default apiHandler("auth.diagnostics", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "GET");
  const tokenActor = await requireActor(req);
  const clerkUserDetails = await loadClerkUserDetails(tokenActor.clerkUserId);
  const effectiveEmail = tokenActor.email ?? (clerkUserDetails.fetchOk ? clerkUserDetails.email : null);
  const effectiveActor = {
    ...tokenActor,
    email: effectiveEmail,
    adminClaim: tokenActor.adminClaim || (clerkUserDetails.fetchOk && clerkUserDetails.adminClaim),
  };
  const member = await findMemberForActor({ clerkUserId: tokenActor.clerkUserId, email: effectiveEmail });
  const admin = actorIsAdmin(effectiveActor);
  const memberApproved = member?.status === "active";

  sendJson(res, 200, {
    signedIn: true,
    admin,
    token: {
      emailPresent: Boolean(tokenActor.email),
      adminClaim: tokenActor.adminClaim,
    },
    clerkUserFetch: {
      hasSecret: Boolean(optionalEnv("CLERK_SECRET_KEY")),
      attempted: clerkUserDetails.fetchAttempted,
      ok: clerkUserDetails.fetchOk,
      status: clerkUserDetails.fetchStatus,
      errorCode: clerkUserDetails.errorCode,
      emailPresent: Boolean(clerkUserDetails.email),
      adminClaim: clerkUserDetails.adminClaim,
    },
    member: {
      found: Boolean(member),
      approved: memberApproved,
      status: member?.status ?? null,
      linkedToClerkUser: Boolean(member?.clerk_user_id),
    },
    recommendedNextChecks: [
      admin ? "Admin claim is active for this account." : "Set Clerk user private metadata to { \"role\": \"admin\" } and sign in again.",
      clerkUserDetails.fetchOk ? "Server-side Clerk user lookup succeeded." : "Confirm CLERK_SECRET_KEY belongs to the same Clerk instance as the signed-in user.",
      memberApproved ? "Approved member access is active for this account." : "Member access requires an approved member row for the signed-in email.",
    ],
  });
});
