import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson } from "../src/server/http.js";

import adminApprove from "../src/routes/admin/applications/[id]/approve.js";
import adminApplications from "../src/routes/admin/applications/index.js";
import adminDiagnostics from "../src/routes/admin/diagnostics.js";
import adminExportApplications from "../src/routes/admin/export/applications.csv.js";
import adminHealth from "../src/routes/admin/health.js";
import adminIncidentNote from "../src/routes/admin/incident-note.js";
import publicConfig from "../src/routes/config/public.js";
import authDiagnostics from "../src/routes/auth/diagnostics.js";
import authMe from "../src/routes/auth/me.js";
import cronHealth from "../src/routes/cron/health.js";
import cronReconcileStripe from "../src/routes/cron/reconcile-stripe.js";
import health from "../src/routes/health.js";
import memberAccreditation from "../src/routes/member/accreditation.js";
import memberContent from "../src/routes/member/content.js";
import memberMe from "../src/routes/member/me.js";
import signupBookingConfirmed from "../src/routes/signup/booking-confirmed.js";
import signupStart from "../src/routes/signup/start.js";
import stripeWebhook from "../src/routes/stripe/webhook.js";

type RouteHandler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

const routes = new Map<string, RouteHandler>([
  ["/api/admin/applications", adminApplications],
  ["/api/admin/diagnostics", adminDiagnostics],
  ["/api/admin/export/applications.csv", adminExportApplications],
  ["/api/admin/health", adminHealth],
  ["/api/admin/incident-note", adminIncidentNote],
  ["/api/auth/diagnostics", authDiagnostics],
  ["/api/auth/me", authMe],
  ["/api/config/public", publicConfig],
  ["/api/cron/health", cronHealth],
  ["/api/cron/reconcile-stripe", cronReconcileStripe],
  ["/api/health", health],
  ["/api/member/accreditation", memberAccreditation],
  ["/api/member/content", memberContent],
  ["/api/member/me", memberMe],
  ["/api/signup/booking-confirmed", signupBookingConfirmed],
  ["/api/signup/start", signupStart],
  ["/api/stripe/webhook", stripeWebhook],
]);

function requestPath(req: VercelRequest): string {
  const base = `https://${req.headers.host ?? "localhost"}`;
  const url = new URL(req.url ?? "/", base);
  const forwardedPath = req.query.path ?? url.searchParams.get("path");
  const pathValue = Array.isArray(forwardedPath) ? forwardedPath.join("/") : forwardedPath;
  const pathname = pathValue ? `/api/${pathValue}` : url.pathname;
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export default async function apiRouter(req: VercelRequest, res: VercelResponse) {
  const path = requestPath(req);
  const approveMatch = path.match(/^\/api\/admin\/applications\/([^/]+)\/approve$/);
  if (approveMatch) {
    (req as VercelRequest & { query: Record<string, unknown> }).query = {
      ...req.query,
      id: decodeURIComponent(approveMatch[1] ?? ""),
    };
    return adminApprove(req, res);
  }

  const route = routes.get(path);
  if (!route) {
    sendJson(res, 404, { error: { code: "not_found", message: "API route not found" } });
    return;
  }

  return route(req, res);
}
