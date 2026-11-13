// Real authenticated workflow against the local stack: sign up an employer,
// verify its credentials, then act as that employer to create and read an
// organization. Nothing is mocked - bcrypt really hashes, PostgREST really
// serves, PostgreSQL really stores.
//
// This covers the SERVER-SIDE authentication path: the same functions the
// NextAuth Credentials provider calls in lib/auth/credentials-authorize.ts.
// It is NOT a browser login - no Next.js server, no session cookie, no JWT
// callback, no sign-in form. See the handoff notes for that distinction.
//
// Skipped unless SUPABASE_URL points at loopback. Every row it creates is
// removed in afterAll, including when an expectation fails.

import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { localTarget } from "./local-integration-env";

const { canRun, serviceKey, url } = localTarget();
const describeLocal = canRun ? describe : describe.skip;

const RUN = `ziltest-${Date.now().toString(36)}`;
const EMAIL = `${RUN}@example.test`;
const PASSWORD = "local-dev-password-8f3c";
const ALREADY_EXISTS = /already exists/i;

describeLocal("local HTTP integration: employer authentication", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  let employerId = "";
  let organizationId = "";

  afterAll(async () => {
    if (organizationId) {
      await admin
        .from("organization_members")
        .delete()
        .eq("organization_id", organizationId);
      await admin.from("organizations").delete().eq("id", organizationId);
    }
    if (employerId) {
      await admin.from("employers").delete().eq("id", employerId);
    }
    const { count } = await admin
      .from("employers")
      .select("id", { count: "exact", head: true })
      .ilike("email", `%${RUN}%`);
    // Thrown rather than asserted: an expect() in a hook is not attributed to
    // any test, so a leak here would be reported confusingly or not at all.
    if ((count ?? 0) !== 0) {
      throw new Error(`Cleanup failed: ${count} ${RUN} employers remain.`);
    }
  });

  it("signs up an employer, storing a bcrypt hash rather than the password", async () => {
    const { createEmployer } = await import("@/lib/auth/employers");
    const employer = await createEmployer(EMAIL, PASSWORD, `${RUN} Industries`);
    employerId = employer.id;
    expect(employer.email).toBe(EMAIL);

    // Read the raw row: the password must not be recoverable from it.
    const { data } = await admin
      .from("employers")
      .select("password_hash")
      .eq("id", employerId)
      .single();
    const hash = (data as { password_hash: string }).password_hash;
    expect(hash).not.toContain(PASSWORD);
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("accepts the correct password and rejects a wrong one", async () => {
    const { verifyEmployerCredentials } = await import("@/lib/auth/employers");
    const ok = await verifyEmployerCredentials(EMAIL, PASSWORD);
    expect(ok?.id).toBe(employerId);

    expect(
      await verifyEmployerCredentials(EMAIL, `${PASSWORD}-wrong`)
    ).toBeNull();
    // The unknown-email branch runs a dummy bcrypt compare so timing cannot
    // reveal whether an account exists; exercise it so it stays working.
    expect(
      await verifyEmployerCredentials(`absent-${RUN}@example.test`, PASSWORD)
    ).toBeNull();
  });

  it("normalizes the email, so sign-in is case-insensitive", async () => {
    const { verifyEmployerCredentials } = await import("@/lib/auth/employers");
    const upper = await verifyEmployerCredentials(
      EMAIL.toUpperCase(),
      PASSWORD
    );
    expect(upper?.id).toBe(employerId);
  });

  it("refuses a duplicate signup for the same email", async () => {
    const { createEmployer } = await import("@/lib/auth/employers");
    await expect(createEmployer(EMAIL, PASSWORD)).rejects.toThrow(
      ALREADY_EXISTS
    );
  });

  // The join between authentication and M1: the member reference the NextAuth
  // session would carry is exactly { memberId: employer.id, memberType }.
  it("creates and reads an organization as the signed-in employer", async () => {
    const { createOrganization, getOrganizationForMember } = await import(
      "@/lib/procurement/organization-actions"
    );
    const member = { memberId: employerId, memberType: "employer" as const };

    const org = await createOrganization(member, {
      companySize: "11-50",
      description: null,
      industry: "Manufacturing",
      isBuyer: true,
      isSupplier: false,
      location: "Karachi",
      name: `${RUN} Buyer Co`,
      website: null,
    });
    organizationId = org.id;

    const readBack = await getOrganizationForMember(member, organizationId);
    expect(readBack?.id).toBe(organizationId);
    expect(readBack?.role).toBe("owner");

    // A different employer id is a different principal and sees nothing.
    const other = {
      memberId: crypto.randomUUID(),
      memberType: "employer" as const,
    };
    expect(await getOrganizationForMember(other, organizationId)).toBeNull();
    // Even an identical UUID in another identity namespace grants no membership.
    expect(
      await getOrganizationForMember(
        { memberId: employerId, memberType: "seeker" },
        organizationId
      )
    ).toBeNull();
    expect(
      await getOrganizationForMember(
        { memberId: employerId, memberType: "recruiter" },
        organizationId
      )
    ).toBeNull();
  });
});
