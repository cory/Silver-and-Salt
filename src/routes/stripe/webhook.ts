import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requiredEnv } from "../../server/env.js";
import { apiHandler, method, readRawBody, sendJson } from "../../server/http.js";
import { verifyStripeWebhook } from "../../server/stripe.js";
import { findApplicationForStripeObject, finishStripeEvent, recordStripeEventStart, transitionApplicationStatus } from "../../server/repository.js";

function periodEndIso(value: unknown): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

export default apiHandler("stripe.webhook", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "POST");
  const raw = await readRawBody(req);
  const signature = typeof req.headers["stripe-signature"] === "string" ? req.headers["stripe-signature"] : undefined;
  const event = verifyStripeWebhook(raw, signature, requiredEnv("STRIPE_WEBHOOK_SECRET"));
  const obj = event.data.object ?? {};
  const app = await findApplicationForStripeObject(obj);
  const fresh = await recordStripeEventStart(event.id, event.type, app?.id ?? null);
  if (!fresh) {
    sendJson(res, 200, { received: true, duplicate: true });
    return;
  }
  try {
    if (!app) {
      await finishStripeEvent(event.id, "ignored", "No matching application");
      sendJson(res, 200, { received: true, ignored: true });
      return;
    }
    if (event.type === "invoice.paid") {
      await transitionApplicationStatus({
        applicationId: app.id,
        to: app.status === "approved" ? "approved" : "paid_pending_vetting",
        actorType: "system",
        stripeInvoiceId: typeof obj.id === "string" ? obj.id : null,
        stripePaymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
        currentPeriodEnd: periodEndIso(obj.lines?.data?.[0]?.period?.end),
        summary: "Stripe invoice paid",
        metadata: { stripeEventId: event.id, invoiceId: obj.id },
      });
      await finishStripeEvent(event.id, "processed");
    } else if (event.type === "charge.refunded") {
      await transitionApplicationStatus({
        applicationId: app.id,
        to: "refunded",
        actorType: "system",
        stripePaymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
        summary: "Stripe charge refunded",
        metadata: { stripeEventId: event.id, chargeId: obj.id },
      });
      await finishStripeEvent(event.id, "processed");
    } else if (event.type === "customer.subscription.deleted") {
      await transitionApplicationStatus({
        applicationId: app.id,
        to: app.status === "refunded" ? "refunded" : "canceled",
        actorType: "system",
        summary: "Stripe subscription canceled",
        metadata: { stripeEventId: event.id, subscriptionId: obj.id },
      });
      await finishStripeEvent(event.id, "processed");
    } else {
      await finishStripeEvent(event.id, "ignored", `Unhandled event type ${event.type}`);
    }
    sendJson(res, 200, { received: true, duplicate: false });
  } catch (error) {
    await finishStripeEvent(event.id, "failed", error instanceof Error ? error.message : String(error));
    throw error;
  }
});
