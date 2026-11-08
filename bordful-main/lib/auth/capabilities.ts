// Single source of truth for what an authenticated role may do, shared by the
// navigation, post-sign-in landing, and the procurement page guards. Kept pure
// and free of next-auth/server imports so the client nav, server components,
// and tests can all read the same mapping rather than each re-deriving it from
// scattered `role === "..."` checks.

export type UserRole = "employer" | "recruiter" | "seeker" | "vendor";

export interface Capabilities {
  /** Creates and manages RFx requests; invites and evaluates suppliers. */
  procurementBuyer: boolean;
  /** Receives RFx invitations and submits responses. */
  procurementSupplier: boolean;
  /** Participates in the job board (browse/apply/post, per role). */
  recruitment: boolean;
  /** Post-sign-in landing, and where "workspace" links point. */
  workspaceHref: string;
}

const GUEST: Capabilities = {
  procurementBuyer: false,
  procurementSupplier: false,
  recruitment: false,
  workspaceHref: "/account",
};

// Buyer and supplier are independent flags rather than one enum because the
// product intent is for a single organization to act as both. The current
// account model cannot express that - an account is an employer OR a
// recruiter, never both - so no role sets both flags today. Widening a role
// here is the only change this layer needs once accounts carry organization
// capabilities; nothing downstream assumes the two are mutually exclusive.
const BY_ROLE: Record<UserRole, Capabilities> = {
  employer: {
    procurementBuyer: true,
    procurementSupplier: false,
    recruitment: true,
    workspaceHref: "/dashboard",
  },
  recruiter: {
    procurementBuyer: false,
    procurementSupplier: true,
    recruitment: true,
    workspaceHref: "/recruiter/dashboard",
  },
  seeker: {
    procurementBuyer: false,
    procurementSupplier: false,
    recruitment: true,
    workspaceHref: "/account",
  },
  // Reserved for standalone (non-recruiter) vendor accounts; no login path
  // issues this role yet - see types/next-auth.d.ts.
  vendor: {
    procurementBuyer: false,
    procurementSupplier: true,
    recruitment: false,
    workspaceHref: "/procurement/vendor",
  },
};

export function capabilitiesFor(role: string | null | undefined): Capabilities {
  if (!role) {
    return GUEST;
  }
  return BY_ROLE[role as UserRole] ?? GUEST;
}

export function hasProcurementAccess(capabilities: Capabilities): boolean {
  return capabilities.procurementBuyer || capabilities.procurementSupplier;
}

/** Buyer and supplier have different procurement home pages. */
export function procurementWorkspaceHref(
  capabilities: Capabilities
): string | null {
  if (capabilities.procurementBuyer) {
    return "/procurement/requests";
  }
  if (capabilities.procurementSupplier) {
    return "/procurement/vendor";
  }
  return null;
}
