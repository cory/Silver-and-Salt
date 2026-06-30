# Agent Runbook

Read this before changing production behavior.

## First Inspection

1. Check `git status --short --branch`.
2. Read `docs/ENVIRONMENTS.md` before touching Vercel, Clerk, Stripe, Postgres, Resend, deployment, or local env behavior.
3. Run `npm test` before and after changes when dependencies are installed.
4. Inspect `/api/admin/diagnostics` with an admin token for runtime truth.
5. Check `audit_events`, `stripe_events`, and `health_checks` before advising manual state changes.

## Hard Database Rule

Postgres stores data only. Do not add functions, triggers, RLS policies, generated columns, database-side defaults such as `now()`, or UUID generation in SQL. IDs, timestamps, transitions, audit events, and reconciliation happen in TypeScript.

`npm run test:sql` enforces this rule across `migrations/*.sql`.

## Environment And Secret Rules

Secrets live in Vercel, Clerk, Stripe, Resend, or local `.env.local`, never in source control or chat. Use `docs/ENVIRONMENTS.md` as the source of truth for local, preview, and production splits. Preview must not use production Clerk, Stripe, or Postgres values. Local mock flags must not be set in Vercel.

## Common Incidents

### Payment Succeeded But Admin Still Shows Pending Payment

1. Check Stripe webhook delivery for `invoice.paid`.
2. Check `stripe_events` for the event ID and processing status.
3. Confirm subscription metadata contains `applicationId`.
4. Re-deliver the webhook from Stripe if metadata is correct.

### Member Cannot Sign In

1. Confirm the application is `approved`.
2. Confirm a row exists in `members` with the member email.
3. Confirm Clerk has a user or pending invitation for the same email.
4. Ask the member to use the same email address as the application.

### Admin Cannot Access `/admin`

1. Confirm the Clerk user private metadata contains `{ "role": "admin" }` in the same Clerk instance used by the deployment.
2. Confirm the browser app loaded `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` through `/api/config/public`.
3. Confirm API calls include a Bearer token.
4. Inspect `/api/auth/diagnostics` while signed in to confirm server-side Clerk lookup and admin claim status.
5. If the user is signed in but redirected to `/`, the token and server-side Clerk lookup did not authorize admin access.

### Refund Did Not Update

1. Confirm Stripe emitted `charge.refunded` to the production webhook endpoint.
2. Check whether the event was duplicate, ignored, or failed in `stripe_events`.
3. If metadata was missing, locate the application by Stripe customer/subscription ID before any manual update.

## Logging And PII

Runtime logs are structured JSON and intentionally redacted. Do not add email, phone, card, accreditation answers, raw webhooks, secrets, or bearer tokens to logs.
