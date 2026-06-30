# Environment And Secret Management

This project is operated through Vercel, Clerk, Stripe, Postgres, and Resend. Treat environment configuration as production behavior. Do not change env vars without checking this file, `.env.example`, and `/api/admin/diagnostics`.

## Source Of Truth

- Committed source of truth for variable names and policy: `.env.example` and this file.
- Runtime source of truth for deployed values: Vercel Project Settings -> Environment Variables for project `silver-and-salt`.
- Local developer override: `.env.local`, which is ignored by git and must never be committed.
- Runtime verification: `/api/health` for coarse status and `/api/admin/diagnostics` for redacted operator/agent context.

Ignored local placeholder files are provided for setup ergonomics:

- `.env.local`: active local development defaults. Provider secrets are commented out so local mock signup keeps working until real test keys are added.
- `.env.development`: optional Vercel Development placeholders.
- `.env.preview`: Vercel Preview checklist placeholders. Real values belong in Vercel Preview env vars.
- `.env.production`: Production checklist placeholders. Real values belong in Vercel Production env vars.

Do not put real secret values in code, docs, git history, issue comments, pull requests, screenshots, logs, or chat. If an agent needs a secret set, the human should paste it directly into Vercel, Clerk, Stripe, or an interactive CLI prompt.

## Environment Split

Use the same variable names in every environment. Values change by target.

| Target | Purpose | Provider mode | Database | Notes |
| --- | --- | --- | --- | --- |
| Local `.env.local` | Fast development and flow testing | Clerk test, Stripe test, local/sandbox Postgres | Local Postgres or disposable hosted DB | May use local-only mock flags. |
| Vercel Development | Optional shared dev env for `vercel env pull` or `vercel env run` | Clerk test, Stripe test | Non-production DB | Do not rely on this more than `.env.local` unless the team agrees. |
| Vercel Preview | PR and branch validation | Clerk test, Stripe test | Preview/staging DB | Never use live Stripe or production Clerk here. |
| Vercel Production | Customer-facing site | Clerk live, Stripe live | Production DB | Only production gets live keys and production price IDs. |

Production and preview should have separate databases. A preview deployment must not write to the production database.

## Required Variables

Core:

- `DATABASE_URL`: Postgres connection string for that target. `POSTGRES_URL` is accepted as an alias when a Vercel/database integration creates it. `SUPABASE_URL` is only the Supabase API endpoint and is not enough for this SQL-backed app. No Postgres functions, triggers, RLS policies, or DB-side workflow logic.
- `APP_BASE_URL`: Canonical base URL. Current Vercel production is `https://silver-and-salt.vercel.app`; local is `http://localhost:3000`. Preview can omit this and rely on Vercel system URLs unless a fixed preview callback is required. Do not move the custom domain without an explicit migration task.
- `OWNER_EMAIL`: Owner/admin alert destination.
- `EMAIL_FROM`: Sender identity for Resend emails.
- `CRON_SECRET`: Random secret for cron endpoints in deployed environments. Locally this can be any dummy value because it only lets developers exercise `/api/cron/*` with the same auth path.
- `SILVER_SALT_CALENDAR_URL`: Booking calendar URL.

Clerk:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Browser key. Clerk test instances use `pk_test_`; production uses `pk_live_`.
- `CLERK_SECRET_KEY`: Server key. Clerk test instances use `sk_test_`; production uses `sk_live_`. Never expose this to frontend code.

Stripe:

- `STRIPE_PUBLISHABLE_KEY`: Browser key. Use `pk_test_` outside production and `pk_live_` only in production.
- `STRIPE_SECRET_KEY`: Server key. Use `sk_test_` outside production and `sk_live_` only in production.
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret for the exact endpoint and mode. Local, preview, and production have different values.
- `SILVER_SALT_STRIPE_PRICE_ID`: Annual founding-member price ID. Test and live Stripe modes have different price IDs even when the product looks identical.

Email:

- `RESEND_API_KEY`: Required for custom email delivery. Without it, email is skipped and recorded in logs.

Local-only behavior:

- `ALLOW_TEST_AUTH_HEADER=1`: Allows `x-test-user-email` for no-Clerk local browser/API testing. Set this to `0` when testing real Clerk locally.
- `ENABLE_MOCK_SIGNUP=1`: Allows local signup to mark payment complete without contacting Stripe. This can stay enabled while using real Clerk locally because signup itself is public.
- `LOCAL_TEST_AUTH_EMAIL`: Display email for the local-only auth harness when `ALLOW_TEST_AUTH_HEADER=1`.

Never set `ALLOW_TEST_AUTH_HEADER=1` or `ENABLE_MOCK_SIGNUP=1` in Vercel Preview or Production. The code restricts these flags to local/test contexts, but the operational rule is still to keep them out of deployed environments.

## Clerk Setup

Use two Clerk instances:

- Development Clerk instance for local and Vercel Preview.
- Production Clerk instance for Vercel Production.

In Clerk Dashboard -> API Keys, copy the publishable and secret keys for the correct instance. Put the development instance keys in local/preview, and production instance keys only in production.

Local real-Clerk mode:

1. Put development Clerk keys in `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
2. Set `ALLOW_TEST_AUTH_HEADER=0` so admin/member APIs require real Clerk tokens.
3. Leave `ENABLE_MOCK_SIGNUP=1` if Stripe is not configured locally.
4. Grant admin access by setting the Clerk user private metadata to `{ "role": "admin" }`.
5. Restart `npm run dev:vercel`.
6. Open `http://localhost:3000/admin` and sign in. A signed-in non-admin is redirected to `/`.

Allowed origins and redirect URLs should include:

- Local: `http://localhost:3000`, redirect to `http://localhost:3000/members` and `http://localhost:3000/admin`.
- Production: `https://silver-and-salt.vercel.app`, redirect to `https://silver-and-salt.vercel.app/members` and `https://silver-and-salt.vercel.app/admin`.
- Preview: Vercel preview domains only if the team wants real Clerk sign-in on preview. Otherwise use local testing for auth-heavy flows.

Admin authorization is app-owned in TypeScript, not through a database policy or email allowlist. Set Clerk user private metadata:

```json
{
  "role": "admin"
}
```

The server fetches the Clerk user with `CLERK_SECRET_KEY` so it can read private metadata. It also accepts deliberate root JWT claims such as `role: "admin"`, `roles` containing `admin`, `admin: true`, or `is_admin: true` if the team later configures a server-owned JWT template. Public metadata, unsafe metadata, and email allowlists do not grant admin access.

## Stripe Setup

Use Stripe test/sandbox mode for local and preview. Use live mode only in production.

Each target needs its own webhook endpoint and signing secret:

- Local: Stripe CLI can forward to `http://localhost:3000/api/stripe/webhook`; put the generated `whsec_...` in `.env.local`.
- Preview: Stripe test webhook endpoint should point to the Vercel preview URL if testing real preview payments.
- Production: Stripe live webhook endpoint should point to `https://silverandsaltcapital.com/api/stripe/webhook`.

Use Stripe-supported test cards and test payment methods only in local/preview. Never test live payment behavior with real card details.

## Vercel CLI Patterns

Supabase integrations may add browser/API variables such as `SUPABASE_URL`. This project needs a Postgres connection string exposed as `DATABASE_URL` or `POSTGRES_URL`. Use the Supabase pooled Postgres connection string for Vercel functions and keep direct database URLs for local migration/admin use.

List configured variable names without values:

```sh
./node_modules/.bin/vercel env ls
./node_modules/.bin/vercel env ls preview
./node_modules/.bin/vercel env ls production
```

Add or update values through the dashboard, or through interactive CLI prompts:

```sh
./node_modules/.bin/vercel env add CLERK_SECRET_KEY preview --sensitive
./node_modules/.bin/vercel env add CLERK_SECRET_KEY production --sensitive
./node_modules/.bin/vercel env add STRIPE_SECRET_KEY preview --sensitive
./node_modules/.bin/vercel env add STRIPE_SECRET_KEY production --sensitive
```

Do not use `echo secret | vercel env add ...`; shell history can retain the value. Prefer paste into the interactive prompt, or use a temporary file with strict permissions and delete it after use.

Pulling env vars to disk:

```sh
./node_modules/.bin/vercel env pull .env.local --environment=development --yes
./node_modules/.bin/vercel env pull .env.preview --environment=preview --yes
```

Only pull to files that are gitignored. After pulling, check variable names only, not values:

```sh
node -e "require('fs').readFileSync('.env.local','utf8').split(/\n/).filter(Boolean).forEach(l=>console.log(l.split('=')[0]))"
```

Running a one-off command without writing secrets to disk:

```sh
./node_modules/.bin/vercel env run -e preview -- npm test
./node_modules/.bin/vercel env run -e production -- npm run smoke:prod
```

After any Vercel env change, redeploy the affected environment. Existing deployments do not automatically pick up changed environment variables.

## Rotation Rules

Rotate immediately if a secret may have been exposed in chat, logs, screenshots, shell history, git history, browser console output, or a third-party tool.

Rotation order:

1. Create the replacement secret in the provider.
2. Add/update the value in Vercel for the correct target.
3. Redeploy the target.
4. Run smoke checks.
5. Revoke the old secret after the new deployment is verified.
6. Add an incident note in the admin UI or `audit_events` if production was affected.

## Agent Rules

Before changing env, auth, billing, deployment, or webhook behavior, agents must:

1. Read this file, `.env.example`, and `docs/AGENT-RUNBOOK.md`.
2. Run `git status --short --branch`.
3. Inspect `/api/admin/diagnostics` when runtime access is available.
4. Verify env names with `vercel env ls`, not by printing values.
5. Never ask the user to paste secrets into chat.
6. Never log or screenshot secret values.
7. Never set local mock flags in Vercel.
8. Never point preview at production Stripe, production Clerk, or production Postgres.
9. Never add database-side business behavior. Postgres stores data only.

## References

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel CLI env command: https://vercel.com/docs/cli/env
- Vercel system environment variables: https://vercel.com/docs/environment-variables/system-environment-variables
- Clerk production deployment: https://clerk.com/docs/guides/development/deployment/production
- Clerk environment variables: https://clerk.com/docs/guides/development/clerk-environment-variables
- Stripe testing: https://docs.stripe.com/testing
