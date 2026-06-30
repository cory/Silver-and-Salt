# Silver & Salt Capital Operations

This site now runs on Vercel with code-owned workflows for signup, payment, approvals, member access, and observability. Read `docs/ENVIRONMENTS.md` before changing Vercel, Clerk, Stripe, Postgres, Resend, or local env configuration.

## Daily Checks

1. Open `/admin` and sign in with an admin Clerk account.
2. Confirm the health cards are green or explainable.
3. Review applications with status `paid_pending_vetting`.
4. Approve only after the vetting conversation is complete.
5. Use Stripe Dashboard for refunds; the webhook records refund state back into the app.

## Approving A Member

1. In `/admin`, find the paid application.
2. Click `Approve`.
3. The app writes the approval, creates an active member row, creates a referral code, sends a Clerk invitation, sends the welcome email, and writes an audit event.
4. If email delivery is skipped, check `RESEND_API_KEY` and resend manually from Clerk or email.

## Refund Path

1. Open the linked customer/subscription in Stripe Dashboard.
2. Refund the first invoice payment and cancel the subscription.
3. Confirm `/admin` shows the application as `refunded` after Stripe delivers `charge.refunded`.
4. If it does not update, inspect `/api/admin/diagnostics` and Stripe webhook delivery history.

## Clerk Setup

See `docs/ENVIRONMENTS.md` for the full local, preview, and production split. In short: use Clerk test instance keys for local and Vercel Preview, Clerk production instance keys only for Vercel Production, and redeploy after changing Vercel env vars. Admin access is controlled by Clerk user private metadata `{ "role": "admin" }`.

## Required Environment Variables

See `.env.example` and `docs/ENVIRONMENTS.md`. Production requires at minimum `DATABASE_URL` or `POSTGRES_URL`, `APP_BASE_URL`, Clerk live keys, Stripe live keys, `STRIPE_WEBHOOK_SECRET`, live `SILVER_SALT_STRIPE_PRICE_ID`, `CRON_SECRET`, and Resend email settings. `SUPABASE_URL` alone is not a database connection string. Preview must use test/sandbox provider values and a non-production database.

## Vercel Cron Cadence

The initial Vercel project is on a Hobby account, so cron jobs are scheduled once per day at `16:00` and `16:17` UTC. If the project moves to Vercel Pro, raise `/api/cron/health` and `/api/cron/reconcile-stripe` back to hourly schedules in `vercel.json`.

## Deployment Checklist

1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run `npm run migrate` against the target database.
4. Run `npm run seed`.
5. Deploy a Vercel preview.
6. Run `npm run smoke:preview`.
7. Test Stripe in test mode with a real webhook endpoint.
8. Confirm counsel-approved disclaimer and refund copy before production.
