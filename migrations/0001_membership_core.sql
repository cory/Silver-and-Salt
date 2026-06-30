CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  standard_amount_cents INTEGER NOT NULL,
  founding_discount_cents INTEGER NOT NULL,
  due_today_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  calendar_url TEXT NOT NULL,
  notification_email TEXT NOT NULL,
  refund_policy TEXT NOT NULL,
  community_commitment TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  status TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  state TEXT NOT NULL,
  referral TEXT NOT NULL,
  referral_name TEXT,
  referral_code TEXT,
  who_you_are TEXT,
  interests_json TEXT NOT NULL,
  linkedin TEXT,
  message TEXT NOT NULL,
  disclaimer_accepted_at TEXT NOT NULL,
  refund_policy_accepted_at TEXT,
  booking_confirmed_at TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  current_period_end TEXT,
  approved_at TEXT,
  refunded_at TEXT,
  canceled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT applications_status_check CHECK (status IN ('pending_payment', 'paid_pending_vetting', 'approved', 'refunded', 'canceled'))
);

CREATE INDEX IF NOT EXISTS applications_group_status_idx ON applications(group_id, status);
CREATE INDEX IF NOT EXISTS applications_email_idx ON applications(email);
CREATE INDEX IF NOT EXISTS applications_stripe_subscription_idx ON applications(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS applications_referral_code_idx ON applications(referral_code);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  application_id TEXT NOT NULL REFERENCES applications(id),
  email TEXT NOT NULL,
  clerk_user_id TEXT,
  status TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT members_status_check CHECK (status IN ('active', 'canceled', 'refunded')),
  CONSTRAINT members_application_unique UNIQUE (application_id),
  CONSTRAINT members_email_group_unique UNIQUE (group_id, email)
);

CREATE INDEX IF NOT EXISTS members_clerk_user_idx ON members(clerk_user_id);

CREATE TABLE IF NOT EXISTS accreditation_profiles (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  group_id TEXT NOT NULL REFERENCES groups(id),
  answers_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT accreditation_member_unique UNIQUE (member_id)
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  application_id TEXT,
  processing_status TEXT NOT NULL,
  error_summary TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT stripe_events_processing_status_check CHECK (processing_status IN ('processing', 'processed', 'failed', 'ignored'))
);

CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  code TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT referral_codes_code_unique UNIQUE (group_id, code)
);

CREATE TABLE IF NOT EXISTS referral_credits (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  referrer_member_id TEXT NOT NULL REFERENCES members(id),
  referred_application_id TEXT NOT NULL REFERENCES applications(id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  earned_at TEXT,
  voided_at TEXT,
  applied_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT referral_credits_status_check CHECK (status IN ('pending', 'applied', 'voided')),
  CONSTRAINT referral_credits_referred_unique UNIQUE (referred_application_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id_hash TEXT,
  application_id TEXT,
  member_id TEXT,
  group_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_application_idx ON audit_events(application_id, created_at);
CREATE INDEX IF NOT EXISTS audit_events_group_idx ON audit_events(group_id, created_at);

CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  details_json TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CONSTRAINT health_checks_status_check CHECK (status IN ('green', 'amber', 'red'))
);

CREATE INDEX IF NOT EXISTS health_checks_component_idx ON health_checks(component, checked_at);
