import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logEvent, requestId } from "./logger.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function method(req: VercelRequest, expected: string): void {
  if (req.method !== expected) throw new HttpError(405, "method_not_allowed", `${expected} required`);
}

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("content-type", "application/json; charset=utf-8").send(JSON.stringify(body));
}

export function sendText(res: VercelResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  res.status(status).setHeader("content-type", contentType).send(body);
}

export async function parseJson<T = unknown>(req: VercelRequest): Promise<T> {
  if (req.body && typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") return JSON.parse(req.body) as T;
  const raw = await readRawBody(req);
  return JSON.parse(raw || "{}") as T;
}

export async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export function apiHandler(
  operation: string,
  handler: (req: VercelRequest, res: VercelResponse, requestId: string) => Promise<void>,
) {
  return async function wrapped(req: VercelRequest, res: VercelResponse): Promise<void> {
    const id = requestId(req);
    const started = Date.now();
    logEvent({ requestId: id, actorType: "anonymous", operation, status: "start" });
    try {
      await handler(req, res, id);
      logEvent({ requestId: id, operation, status: "ok", durationMs: Date.now() - started });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : "internal_error";
      logEvent({
        requestId: id,
        operation,
        status: "error",
        durationMs: Date.now() - started,
        errorCode: code,
        detail: { message: error instanceof Error ? error.message : String(error) },
      });
      sendJson(res, status, { error: { code, message: status >= 500 ? "Internal server error" : (error as Error).message }, requestId: id });
    }
  };
}
