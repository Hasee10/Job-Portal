-- Tracks the last time each recruiter received the "new matching candidates"
-- digest email, so the cron only sends about seekers who opted in after the
-- previous run instead of re-notifying the recruiter's entire pool every time.
alter table recruiter_accounts
  add column if not exists last_candidate_digest_at timestamptz;
