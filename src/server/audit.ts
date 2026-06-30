import { newId, nowIso } from "./ids.js";
import { query } from "./db.js";

export interface AuditInput {
  actorType: "anonymous" | "member" | "admin" | "cron" | "system";
  actorIdHash?: string | null;
  applicationId?: string | null;
  memberId?: string | null;
  groupId?: string | null;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  await query(
    `INSERT INTO audit_events (id, actor_type, actor_id_hash, application_id, member_id, group_id, event_type, summary, metadata_json, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      newId("audit"),
      input.actorType,
      input.actorIdHash ?? null,
      input.applicationId ?? null,
      input.memberId ?? null,
      input.groupId ?? null,
      input.eventType,
      input.summary,
      JSON.stringify(input.metadata ?? {}),
      nowIso(),
    ],
  );
}
