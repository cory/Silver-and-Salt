import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DEFAULT_GROUP_ID, mockSignupEnabled, publicConfig } from "../../server/env.js";
import { apiHandler, method, parseJson, sendJson, HttpError } from "../../server/http.js";
import { validateSignupStart } from "../../contracts/signup.js";
import { createApplication, transitionApplicationStatus, updateApplicationStripe } from "../../server/repository.js";
import { createCustomer, createIncompleteSubscription, stripeConfigured } from "../../server/stripe.js";
import { getGroup } from "../../server/groups.js";

export default apiHandler("signup.start", async (req: VercelRequest, res: VercelResponse) => {
  method(req, "POST");
  const input = validateSignupStart(await parseJson(req));
  const group = await getGroup(input.groupId ?? DEFAULT_GROUP_ID);
  const app = await createApplication(input);
  if (mockSignupEnabled() && !stripeConfigured()) {
    await updateApplicationStripe({
      applicationId: app.id,
      customerId: `cus_mock_${app.id}`,
      subscriptionId: `sub_mock_${app.id}`,
      invoiceId: `in_mock_${app.id}`,
      paymentIntentId: `pi_mock_${app.id}`,
    });
    const paid = await transitionApplicationStatus({
      applicationId: app.id,
      to: "paid_pending_vetting",
      actorType: "system",
      stripeInvoiceId: `in_mock_${app.id}`,
      stripePaymentIntentId: `pi_mock_${app.id}`,
      summary: "Local mock payment completed",
      metadata: { mode: "local_mock" },
    });
    sendJson(res, 200, {
      applicationId: paid.id,
      clientSecret: null,
      stripePublishableKey: null,
      mockPayment: true,
      calendarUrl: group.calendar_url,
      price: {
        standardAmountCents: group.standard_amount_cents,
        foundingDiscountCents: group.founding_discount_cents,
        dueTodayCents: group.due_today_cents,
        currency: group.currency,
        cadence: "year",
      },
    });
    return;
  }
  if (!stripeConfigured()) throw new HttpError(503, "stripe_not_configured", "Stripe is not configured yet");
  if (group.stripe_price_id === "price_configure_me") throw new HttpError(503, "stripe_price_missing", "Stripe price ID is not configured yet");
  const customer = await createCustomer({ email: input.email, name: `${input.firstName} ${input.lastName}`, applicationId: app.id, groupId: group.id });
  const subscription = await createIncompleteSubscription({
    customerId: customer.id,
    priceId: group.stripe_price_id,
    applicationId: app.id,
    groupId: group.id,
    email: input.email,
    referralCode: app.referral_code,
  });
  const invoice = subscription.latest_invoice;
  const paymentIntent = invoice?.payment_intent;
  const clientSecret = paymentIntent?.client_secret;
  if (!clientSecret) throw new HttpError(502, "stripe_client_secret_missing", "Stripe did not return a payment client secret");
  await updateApplicationStripe({
    applicationId: app.id,
    customerId: customer.id,
    subscriptionId: subscription.id,
    invoiceId: typeof invoice?.id === "string" ? invoice.id : null,
    paymentIntentId: typeof paymentIntent?.id === "string" ? paymentIntent.id : null,
  });
  sendJson(res, 200, {
    applicationId: app.id,
    clientSecret,
    stripePublishableKey: publicConfig().stripePublishableKey,
    calendarUrl: group.calendar_url,
    price: {
      standardAmountCents: group.standard_amount_cents,
      foundingDiscountCents: group.founding_discount_cents,
      dueTodayCents: group.due_today_cents,
      currency: group.currency,
      cadence: "year",
    },
  });
});
