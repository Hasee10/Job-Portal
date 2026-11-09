-- M4B2-B: organization-owned RFQ evaluation and award.
--
-- Two separate, independently-justified changes, not one bridge:
--
-- 1. procurement_evaluations.evaluator_id references public.employers(id).
--    Organization membership (M1) lets an owner/admin be employer-,
--    recruiter- or seeker-typed - procurement_audit_log.actor_role was
--    already widened to all three in M4A for exactly this reason. A
--    recruiter- or seeker-typed owner evaluating a response would violate
--    this FK outright, and no single legacy table covers all three member
--    types to reference instead. evaluator_id is never joined against
--    employers in application code (grep confirmed) - the FK was
--    enforcement with no consumer, not a data dependency - so it is
--    dropped rather than widened. The column stays NOT NULL; every
--    evaluator is always some member id, legacy or organization-scoped.
--
-- 2. procurement_requests has no column recording which response won.
--    awardRequest() only ever set status='awarded' and awarded_at; the
--    winning response id existed solely as audit-log JSONB metadata, which
--    is not a reliable queryable source of truth. This is a pre-existing
--    gap in the legacy flow, not something M4A/M4B introduced, and benefits
--    both legacy and organization-owned requests identically. Nullable and
--    not backfilled: existing awarded rows have no reliable response to
--    attribute retroactively, so they are left null rather than guessed
--    from an audit-log entry that might not be the only one on record.

alter table public.procurement_evaluations
  drop constraint if exists procurement_evaluations_evaluator_id_fkey;

alter table public.procurement_requests
  add column if not exists awarded_response_id uuid
    references public.procurement_responses(id);
