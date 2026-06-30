import { DEFAULT_GROUP_ID, optionalEnv } from "./env.js";
import { newId, nowIso } from "./ids.js";
import { foundingMemberPrice } from "../domain/pricing.js";
import { one, query } from "./db.js";

export interface GroupRecord {
  id: string;
  display_name: string;
  stripe_price_id: string;
  standard_amount_cents: number;
  founding_discount_cents: number;
  due_today_cents: number;
  currency: string;
  calendar_url: string;
  notification_email: string;
  refund_policy: string;
  community_commitment: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_REFUND_POLICY =
  "Your $900 founding-member fee covers your first year and is charged when you submit your application. Membership is annual and renews automatically each year unless you cancel before the renewal date. If, after our conversation, Silver & Salt Capital determines membership is not a mutual fit, your full $900 is refunded to your original payment method and your membership is canceled.";

const DEFAULT_COMMITMENT =
  "Silver & Salt Capital members show up with care, discretion, curiosity, and a commitment to backing women building durable Utah companies.";

export async function ensureDefaultGroup(): Promise<GroupRecord> {
  const price = foundingMemberPrice();
  const now = nowIso();
  const existing = await one<GroupRecord>(`SELECT * FROM groups WHERE id = $1`, [DEFAULT_GROUP_ID]);
  if (existing) return existing;
  const id = DEFAULT_GROUP_ID || newId("group");
  await query(
    `INSERT INTO groups (id, display_name, stripe_price_id, standard_amount_cents, founding_discount_cents, due_today_cents, currency, calendar_url, notification_email, refund_policy, community_commitment, active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id,
      "Silver & Salt Capital",
      optionalEnv("SILVER_SALT_STRIPE_PRICE_ID") ?? "price_configure_me",
      price.standardAmountCents,
      price.foundingDiscountCents,
      price.dueTodayCents,
      price.currency,
      optionalEnv("SILVER_SALT_CALENDAR_URL") ?? "https://calendar.google.com/",
      optionalEnv("OWNER_EMAIL") ?? "tori@silverandsaltcapital.com",
      DEFAULT_REFUND_POLICY,
      DEFAULT_COMMITMENT,
      true,
      now,
      now,
    ],
  );
  const created = await one<GroupRecord>(`SELECT * FROM groups WHERE id = $1`, [id]);
  if (!created) throw new Error("failed to create default group");
  return created;
}

export async function getGroup(groupId = DEFAULT_GROUP_ID): Promise<GroupRecord> {
  await ensureDefaultGroup();
  const group = await one<GroupRecord>(`SELECT * FROM groups WHERE id = $1`, [groupId]);
  if (!group) throw new Error(`Unknown group: ${groupId}`);
  return group;
}
