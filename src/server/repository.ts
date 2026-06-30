import type pg from "pg";
import { DEFAULT_GROUP_ID } from "./env.js";
import { newId, nowIso } from "./ids.js";
import { one, query, withTransaction } from "./db.js";
import { ensureDefaultGroup, getGroup } from "./groups.js";
import { recordAudit } from "./audit.js";
import { assertTransition, type ApplicationStatus } from "../domain/status.js";
import type { SignupStartInput } from "../contracts/signup.js";

export interface ApplicationRecord {
  id: string;
  group_id: string;
  status: ApplicationStatus;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  state: string;
  referral: string;
  referral_name: string | null;
  referral_code: string | null;
  who_you_are: string | null;
  interests_json: string;
  linkedin: string | null;
  message: string;
  disclaimer_accepted_at: string;
  refund_policy_accepted_at: string | null;
  booking_confirmed_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  current_period_end: string | null;
  approved_at: string | null;
  refunded_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberRecord {
  id: string;
  group_id: string;
  application_id: string;
  email: string;
  clerk_user_id: string | null;
  status: "active" | "canceled" | "refunded";
  approved_at: string;
  created_at: string;
  updated_at: string;
}

export async function createApplication(input: SignupStartInput): Promise<ApplicationRecord> {
  const group = await getGroup(input.groupId ?? DEFAULT_GROUP_ID);
  const now = nowIso();
  const id = newId("app");
  const referralCode = input.referralName ? input.referralName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : null;
  await query(
    `INSERT INTO applications (id, group_id, status, first_name, last_name, email, phone, state, referral, referral_name, referral_code, who_you_are, interests_json, linkedin, message, disclaimer_accepted_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      id,
      group.id,
      "pending_payment",
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.state,
      input.referral,
      input.referralName ?? null,
      referralCode,
      input.whoYouAre ?? null,
      JSON.stringify(input.interests ?? []),
      input.linkedin ?? null,
      input.message,
      now,
      now,
      now,
    ],
  );
  await recordAudit({ actorType: "anonymous", applicationId: id, groupId: group.id, eventType: "application.created", summary: "Application intake submitted" });
  const created = await getApplication(id);
  if (!created) throw new Error("Application insert failed");
  return created;
}

export async function getApplication(id: string): Promise<ApplicationRecord | null> {
  return one<ApplicationRecord>(`SELECT * FROM applications WHERE id = $1`, [id]);
}

export async function updateApplicationStripe(args: {
  applicationId: string;
  customerId: string;
  subscriptionId: string;
  invoiceId?: string | null;
  paymentIntentId?: string | null;
}): Promise<void> {
  await query(
    `UPDATE applications
     SET stripe_customer_id = $2, stripe_subscription_id = $3, stripe_invoice_id = $4, stripe_payment_intent_id = $5, updated_at = $6
     WHERE id = $1`,
    [args.applicationId, args.customerId, args.subscriptionId, args.invoiceId ?? null, args.paymentIntentId ?? null, nowIso()],
  );
}

export async function markBookingConfirmed(applicationId: string, refundPolicyAccepted: boolean): Promise<ApplicationRecord> {
  const now = nowIso();
  await query(
    `UPDATE applications
     SET booking_confirmed_at = $2, refund_policy_accepted_at = CASE WHEN $3 THEN COALESCE(refund_policy_accepted_at, $2) ELSE refund_policy_accepted_at END, updated_at = $2
     WHERE id = $1`,
    [applicationId, now, refundPolicyAccepted],
  );
  await recordAudit({ actorType: "anonymous", applicationId, eventType: "booking.confirmed", summary: "Applicant confirmed booking step", metadata: { refundPolicyAccepted } });
  const app = await getApplication(applicationId);
  if (!app) throw new Error("Application not found after booking update");
  return app;
}

export async function transitionApplicationStatus(args: {
  applicationId: string;
  to: ApplicationStatus;
  actorType: "system" | "admin" | "cron";
  actorIdHash?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  currentPeriodEnd?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<ApplicationRecord> {
  return withTransaction(async (client) => {
    const current = await client.query<ApplicationRecord>(`SELECT * FROM applications WHERE id = $1 FOR UPDATE`, [args.applicationId]);
    const app = current.rows[0];
    if (!app) throw new Error("Application not found");
    assertTransition(app.status, args.to);
    const now = nowIso();
    const approvedAt = args.to === "approved" ? now : app.approved_at;
    const refundedAt = args.to === "refunded" ? now : app.refunded_at;
    const canceledAt = args.to === "canceled" ? now : app.canceled_at;
    await client.query(
      `UPDATE applications
       SET status = $2, stripe_invoice_id = COALESCE($3, stripe_invoice_id), stripe_payment_intent_id = COALESCE($4, stripe_payment_intent_id), current_period_end = COALESCE($5, current_period_end), approved_at = $6, refunded_at = $7, canceled_at = $8, updated_at = $9
       WHERE id = $1`,
      [args.applicationId, args.to, args.stripeInvoiceId ?? null, args.stripePaymentIntentId ?? null, args.currentPeriodEnd ?? null, approvedAt, refundedAt, canceledAt, now],
    );
    await client.query(
      `INSERT INTO audit_events (id, actor_type, actor_id_hash, application_id, group_id, event_type, summary, metadata_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newId("audit"), args.actorType, args.actorIdHash ?? null, app.id, app.group_id, `application.${args.to}`, args.summary, JSON.stringify(args.metadata ?? {}), now],
    );
    const updated = await client.query<ApplicationRecord>(`SELECT * FROM applications WHERE id = $1`, [args.applicationId]);
    return updated.rows[0]!;
  });
}

async function createReferralCodeForMember(client: pg.PoolClient, member: MemberRecord): Promise<void> {
  const base = member.email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || member.id.slice(-8);
  const code = `${base}-${member.id.slice(-6)}`;
  const now = nowIso();
  await client.query(
    `INSERT INTO referral_codes (id, group_id, member_id, code, active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (group_id, code) DO NOTHING`,
    [newId("ref"), member.group_id, member.id, code, true, now, now],
  );
}

async function createReferralCreditIfEligible(client: pg.PoolClient, app: ApplicationRecord): Promise<void> {
  if (!app.referral_code) return;
  const ref = await client.query<{ member_id: string }>(
    `SELECT member_id FROM referral_codes WHERE group_id = $1 AND code = $2 AND active = true`,
    [app.group_id, app.referral_code],
  );
  const referrer = ref.rows[0];
  if (!referrer) return;
  const now = nowIso();
  await client.query(
    `INSERT INTO referral_credits (id, group_id, referrer_member_id, referred_application_id, amount_cents, status, earned_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (referred_application_id) DO NOTHING`,
    [newId("credit"), app.group_id, referrer.member_id, app.id, 10_000, "pending", now, now, now],
  );
}

export async function approveApplication(args: { applicationId: string; actorIdHash: string | null; clerkUserId?: string | null }): Promise<{ application: ApplicationRecord; member: MemberRecord }> {
  return withTransaction(async (client) => {
    const current = await client.query<ApplicationRecord>(`SELECT * FROM applications WHERE id = $1 FOR UPDATE`, [args.applicationId]);
    const app = current.rows[0];
    if (!app) throw new Error("Application not found");
    assertTransition(app.status, "approved");
    const now = nowIso();
    await client.query(
      `UPDATE applications SET status = 'approved', approved_at = $2, updated_at = $2 WHERE id = $1`,
      [app.id, now],
    );
    const memberId = newId("mem");
    await client.query(
      `INSERT INTO members (id, group_id, application_id, email, clerk_user_id, status, approved_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (application_id) DO NOTHING`,
      [memberId, app.group_id, app.id, app.email, args.clerkUserId ?? null, "active", now, now, now],
    );
    const memberResult = await client.query<MemberRecord>(`SELECT * FROM members WHERE application_id = $1`, [app.id]);
    const member = memberResult.rows[0]!;
    await createReferralCodeForMember(client, member);
    await createReferralCreditIfEligible(client, app);
    await client.query(
      `INSERT INTO audit_events (id, actor_type, actor_id_hash, application_id, member_id, group_id, event_type, summary, metadata_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [newId("audit"), "admin", args.actorIdHash, app.id, member.id, app.group_id, "application.approved", "Application approved and member activated", JSON.stringify({}), now],
    );
    const updated = await client.query<ApplicationRecord>(`SELECT * FROM applications WHERE id = $1`, [app.id]);
    return { application: updated.rows[0]!, member };
  });
}

export async function findApplicationForStripeObject(obj: Record<string, any>): Promise<ApplicationRecord | null> {
  const applicationId = obj.metadata?.applicationId ?? obj.subscription_details?.metadata?.applicationId;
  if (typeof applicationId === "string" && applicationId) return getApplication(applicationId);
  const subscription = typeof obj.subscription === "string" ? obj.subscription : typeof obj.id === "string" && String(obj.object) === "subscription" ? obj.id : null;
  if (subscription) return one<ApplicationRecord>(`SELECT * FROM applications WHERE stripe_subscription_id = $1`, [subscription]);
  const customer = typeof obj.customer === "string" ? obj.customer : null;
  if (customer) return one<ApplicationRecord>(`SELECT * FROM applications WHERE stripe_customer_id = $1 ORDER BY created_at DESC LIMIT 1`, [customer]);
  return null;
}

export async function recordStripeEventStart(eventId: string, eventType: string, applicationId: string | null): Promise<boolean> {
  const now = nowIso();
  const result = await query(
    `INSERT INTO stripe_events (id, event_type, application_id, processing_status, received_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO NOTHING`,
    [eventId, eventType, applicationId, "processing", now, now, now],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function finishStripeEvent(eventId: string, status: "processed" | "failed" | "ignored", errorSummary?: string | null): Promise<void> {
  const now = nowIso();
  await query(
    `UPDATE stripe_events SET processing_status = $2, error_summary = $3, processed_at = $4, updated_at = $4 WHERE id = $1`,
    [eventId, status, errorSummary ?? null, now],
  );
}

export async function findOrAttachMember(args: { clerkUserId: string; email: string | null }): Promise<MemberRecord | null> {
  let member = await one<MemberRecord>(`SELECT * FROM members WHERE clerk_user_id = $1 AND status = 'active'`, [args.clerkUserId]);
  if (member) return member;
  if (args.email) {
    member = await one<MemberRecord>(`SELECT * FROM members WHERE email = $1 AND status = 'active'`, [args.email]);
    if (member && !member.clerk_user_id) {
      await query(`UPDATE members SET clerk_user_id = $2, updated_at = $3 WHERE id = $1`, [member.id, args.clerkUserId, nowIso()]);
      member = await one<MemberRecord>(`SELECT * FROM members WHERE id = $1`, [member.id]);
    }
  }
  return member;
}

export async function findMemberForActor(args: { clerkUserId: string; email: string | null }): Promise<MemberRecord | null> {
  const member = await one<MemberRecord>(`SELECT * FROM members WHERE clerk_user_id = $1 AND status = 'active'`, [args.clerkUserId]);
  if (member) return member;
  if (args.email) return one<MemberRecord>(`SELECT * FROM members WHERE email = $1 AND status = 'active'`, [args.email]);
  return null;
}

export async function listApplications(): Promise<ApplicationRecord[]> {
  await ensureDefaultGroup();
  const result = await query<ApplicationRecord>(`SELECT * FROM applications ORDER BY created_at DESC LIMIT 250`);
  return result.rows;
}

export async function insertAccreditation(args: { memberId: string; groupId: string; answers: Record<string, unknown> }): Promise<void> {
  const now = nowIso();
  await query(
    `INSERT INTO accreditation_profiles (id, member_id, group_id, answers_json, submitted_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (member_id) DO UPDATE SET answers_json = EXCLUDED.answers_json, submitted_at = EXCLUDED.submitted_at, updated_at = EXCLUDED.updated_at`,
    [newId("accr"), args.memberId, args.groupId, JSON.stringify(args.answers), now, now, now],
  );
  await recordAudit({ actorType: "member", memberId: args.memberId, groupId: args.groupId, eventType: "accreditation.submitted", summary: "Member submitted accreditation profile" });
}

export async function addHealthCheck(component: string, status: "green" | "amber" | "red", summary: string, details: Record<string, unknown> = {}): Promise<void> {
  const now = nowIso();
  await query(
    `INSERT INTO health_checks (id, component, status, summary, details_json, checked_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [newId("health"), component, status, summary, JSON.stringify(details), now, now],
  );
}

export async function healthSnapshot() {
  await ensureDefaultGroup();
  const [lastSignup, lastWebhook, paidPending, recentErrors, checks] = await Promise.all([
    one<{ created_at: string }>(`SELECT created_at FROM applications ORDER BY created_at DESC LIMIT 1`),
    one<{ received_at: string }>(`SELECT received_at FROM stripe_events ORDER BY received_at DESC LIMIT 1`),
    one<{ count: string }>(`SELECT COUNT(*)::text AS count FROM applications WHERE status = 'paid_pending_vetting'`),
    query<{ id: string; event_type: string; error_summary: string | null; updated_at: string }>(`SELECT id, event_type, error_summary, updated_at FROM stripe_events WHERE processing_status = 'failed' ORDER BY updated_at DESC LIMIT 10`),
    query<{ component: string; status: string; summary: string; checked_at: string }>(`SELECT DISTINCT ON (component) component, status, summary, checked_at FROM health_checks ORDER BY component, checked_at DESC`),
  ]);
  return {
    lastSignupAt: lastSignup?.created_at ?? null,
    lastWebhookAt: lastWebhook?.received_at ?? null,
    paidPendingVettingCount: Number(paidPending?.count ?? 0),
    recentStripeErrors: recentErrors.rows,
    componentChecks: checks.rows,
  };
}

export async function diagnosticsSnapshot() {
  const health = await healthSnapshot();
  const audits = await query<{ event_type: string; summary: string; created_at: string }>(`SELECT event_type, summary, created_at FROM audit_events ORDER BY created_at DESC LIMIT 20`);
  return {
    config: {
      hasDefaultGroup: !!(await one(`SELECT id FROM groups WHERE id = $1`, [DEFAULT_GROUP_ID])),
    },
    health,
    recentAuditEvents: audits.rows,
    recommendedNextChecks: [
      "Check recentStripeErrors first when payment state looks wrong.",
      "Compare lastWebhookAt against Stripe Dashboard delivery history if webhook freshness is stale.",
      "Use application audit events before changing member or payment state manually.",
    ],
  };
}
