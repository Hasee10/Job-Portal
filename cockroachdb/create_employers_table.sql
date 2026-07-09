-- Employer accounts for sign-in/sign-up (job seekers browse anonymously -
-- only employers have accounts, to post/feature jobs and eventually manage
-- listings). Password hashing (bcrypt) happens in the app; this table only
-- ever stores the hash, never a plaintext password.
--
-- Run this in the CockroachDB SQL console, then grant the existing
-- portal_reader user (the credential the Vercel deployment already uses)
-- write access to this ONE table specifically - portal_reader stays
-- read-only on public.jobs, preserving the original least-privilege intent;
-- this grant is scoped narrowly to the new employers table only.

-- reset_token_hash/reset_token_expires_at support "forgot password" - only
-- the SHA-256 hash of the reset token is ever stored, never the raw token,
-- so a database read (backup leak, compromised replica, etc.) can't be used
-- to reset anyone's password.
CREATE TABLE IF NOT EXISTS public.employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email STRING NOT NULL UNIQUE,
  password_hash STRING NOT NULL,
  company_name STRING,
  reset_token_hash STRING,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.employers TO portal_reader;

-- Verify: should show portal_reader with select/insert/update only.
SHOW GRANTS ON public.employers FOR portal_reader;
