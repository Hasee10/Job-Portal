-- Dedicated credential for the GitHub Actions scraper workflow, separate
-- from the admin credential used locally (job-scraper/.env) for
-- retention_cleanup.py / backfill_sanitize.py, which need DELETE/broader
-- access. This user can only read, insert, and update public.jobs - it
-- cannot delete rows or touch any other table.
--
-- Replace REPLACE_WITH_YOUR_OWN_PASSWORD below with a password you choose,
-- then run this whole file in the CockroachDB SQL shell/console.

CREATE USER IF NOT EXISTS scraper_ci WITH PASSWORD 'REPLACE_WITH_YOUR_OWN_PASSWORD';

GRANT CONNECT ON DATABASE jobs_db TO scraper_ci;
GRANT USAGE ON SCHEMA public TO scraper_ci;
GRANT SELECT, INSERT, UPDATE ON public.jobs TO scraper_ci;

-- Verify: should show scraper_ci with select/insert/update only, no delete.
SHOW GRANTS ON public.jobs FOR scraper_ci;
