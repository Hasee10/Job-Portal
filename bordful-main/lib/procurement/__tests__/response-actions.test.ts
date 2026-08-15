import { describe, expect, it } from 'vitest';
import { canVendorSubmitResponse, isSealedFromBuyer } from '../response-actions';

describe('canVendorSubmitResponse (prequalification gate)', () => {
  it('allows any vendor on an open-visibility request regardless of invitation', () => {
    expect(canVendorSubmitResponse('open', null)).toEqual({ allowed: true });
  });

  it('rejects an invite-only request with no invitation at all', () => {
    const result = canVendorSubmitResponse('invite_only', null);
    expect(result.allowed).toBe(false);
  });

  it('allows a vendor whose invitation is simply "invited" (no prequalification required)', () => {
    expect(canVendorSubmitResponse('invite_only', 'invited')).toEqual({ allowed: true });
  });

  it('allows a vendor whose invitation has been viewed', () => {
    expect(canVendorSubmitResponse('invite_only', 'viewed')).toEqual({ allowed: true });
  });

  it('allows a vendor explicitly approved through prequalification', () => {
    expect(canVendorSubmitResponse('invite_only', 'prequalification_approved')).toEqual({ allowed: true });
  });

  it('blocks a vendor whose prequalification is still pending buyer approval', () => {
    const result = canVendorSubmitResponse('invite_only', 'prequalification_pending');
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/pending buyer approval/i);
  });

  it('blocks a vendor whose prequalification was rejected', () => {
    const result = canVendorSubmitResponse('invite_only', 'prequalification_rejected');
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/not approved/i);
  });

  it('blocks a vendor who already responded (cannot resubmit through this gate)', () => {
    const result = canVendorSubmitResponse('invite_only', 'responded');
    expect(result.allowed).toBe(false);
  });

  it('blocks a vendor who declined the invitation', () => {
    const result = canVendorSubmitResponse('invite_only', 'declined');
    expect(result.allowed).toBe(false);
  });
});

describe('isSealedFromBuyer (sealed-bid visibility rule)', () => {
  it('is not sealed when the request does not use sealed bidding', () => {
    expect(isSealedFromBuyer(false, 'published')).toBe(false);
    expect(isSealedFromBuyer(false, 'closed_for_responses')).toBe(false);
  });

  it('hides content from the buyer while published and sealed', () => {
    expect(isSealedFromBuyer(true, 'published')).toBe(true);
  });

  it('hides content from the buyer once closed for responses but not yet opened', () => {
    expect(isSealedFromBuyer(true, 'closed_for_responses')).toBe(true);
  });

  it('reveals content once bids have been explicitly opened', () => {
    expect(isSealedFromBuyer(true, 'bids_opened')).toBe(false);
  });

  it('reveals content during evaluation and after award', () => {
    expect(isSealedFromBuyer(true, 'evaluating')).toBe(false);
    expect(isSealedFromBuyer(true, 'awarded')).toBe(false);
  });
});
