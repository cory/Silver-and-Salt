import type { VercelRequest } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { hashValue, redactObject } from "./redact.js";

export interface LogEvent {
  requestId?: string;
  actorType?: "anonymous" | "member" | "admin" | "cron" | "system";
  actorIdHash?: string | null;
  applicationId?: string | null;
  groupId?: string | null;
  stripeEventId?: string | null;
  operation: string;
  status: "start" | "ok" | "error";
  durationMs?: number;
  errorCode?: string;
  detail?: unknown;
}

export function requestId(req: VercelRequest): string {
  const existing = req.headers["x-request-id"];
  return typeof existing === "string" && existing ? existing : randomUUID();
}

export function logEvent(event: LogEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    service: "silver-salt-vercel",
    ...event,
    detail: event.detail === undefined ? undefined : redactObject(event.detail),
  };
  console.log(JSON.stringify(payload));
}

export function actorHash(emailOrId: string | null | undefined): string | null {
  return hashValue(emailOrId);
}
