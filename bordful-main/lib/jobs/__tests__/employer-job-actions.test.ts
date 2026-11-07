import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A generic chainable fake, not the field-specific mocks in
// lib/auth/__tests__/employers.test.ts, because the functions under test
// call .eq() a variable number of times before ending the chain with either
// .select().single(), .maybeSingle(), .order(), or nothing at all (awaiting
// the builder directly) - the real Supabase client supports all of these by
// having every method return a thenable builder. Every call is recorded so
// tests can assert exactly which filters were applied, which is the actual
// ownership boundary under test here.
interface Call {
  args: unknown[];
  method: string;
}

interface Chain {
  eq: (...args: unknown[]) => Chain;
  insert: (...args: unknown[]) => Chain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  order: (...args: unknown[]) => Chain;
  select: (...args: unknown[]) => Chain;
  single: () => Promise<{ data: unknown; error: unknown }>;
  // Intentionally thenable: listOwnerJobs awaits the chain directly, with
  // no terminal .single()/.maybeSingle() call, same as the real client.
  then: (resolve: (v: unknown) => void) => void;
  update: (...args: unknown[]) => Chain;
}

function createChain(result: { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const chain: Chain = {
    eq: (...args: unknown[]) => {
      calls.push({ args, method: "eq" });
      return chain;
    },
    insert: (...args: unknown[]) => {
      calls.push({ args, method: "insert" });
      return chain;
    },
    maybeSingle: () => Promise.resolve(result),
    order: (...args: unknown[]) => {
      calls.push({ args, method: "order" });
      return chain;
    },
    select: (...args: unknown[]) => {
      calls.push({ args, method: "select" });
      return chain;
    },
    single: () => Promise.resolve(result),
    // biome-ignore lint/suspicious/noThenProperty: deliberately thenable, mirrors Supabase's own awaitable query builder
    then: (resolve: (v: unknown) => void) => resolve(result),
    update: (...args: unknown[]) => {
      calls.push({ args, method: "update" });
      return chain;
    },
  };
  return { calls, chain };
}

let activeResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let activeChain: ReturnType<typeof createChain>["chain"];
let activeCalls: Call[];
const fromMock = vi.fn(() => activeChain);
const createClientMock = vi.fn((..._args: unknown[]) => ({ from: fromMock }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const {
  createJob,
  updateJob,
  closeJob,
  reopenJob,
  getOwnerJob,
  listOwnerJobs,
} = await import("@/lib/jobs/employer-job-actions");
type JobPostInput = Parameters<typeof createJob>[2];

function setResult(result: { data: unknown; error: unknown }) {
  activeResult = result;
  const created = createChain(activeResult);
  activeChain = created.chain;
  activeCalls = created.calls;
}

function eqCalls() {
  return activeCalls.filter((c) => c.method === "eq");
}

const EMPLOYER_OWNER = { employerId: "emp_1" } as const;
const RECRUITER_OWNER = { recruiterId: "rec_1" } as const;

const MINIMAL_JOB_INPUT: JobPostInput = {
  acceptsApplications: false,
  applicationRequirements: null,
  autoShortlistThreshold: 70,
  benefits: null,
  careerLevel: [],
  description: "desc",
  externalApplyUrl: "https://example.com/apply",
  minExperienceYears: null,
  requiredSkills: [],
  salaryCurrency: "USD",
  salaryMax: null,
  salaryMin: null,
  salaryUnit: "year",
  skills: null,
  title: "Engineer",
  type: "Full-time",
  workplaceCity: null,
  workplaceCountry: null,
  workplaceType: "Remote",
};

const JOB_ROW = {
  accepts_applications: false,
  apply_url: "https://example.com/apply",
  auto_shortlist_threshold: 70,
  benefits: null,
  career_level: ["NotSpecified"],
  company: "Acme",
  description: "desc",
  employer_id: "emp_1",
  id: "job_1",
  posted_at: "2026-01-01T00:00:00Z",
  required_skills: [],
  title: "Engineer",
  type: "Full-time",
};

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  setResult({ data: JOB_ROW, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createJob", () => {
  it("inserts under employer_id (not recruiter_id) for an employer owner", async () => {
    await createJob(EMPLOYER_OWNER, "Acme", MINIMAL_JOB_INPUT);

    const insertCall = activeCalls.find((c) => c.method === "insert");
    const row = insertCall?.args[0] as Record<string, unknown>;
    expect(row.employer_id).toBe("emp_1");
    expect(row.recruiter_id).toBeUndefined();
  });

  it("inserts under recruiter_id (not employer_id) for a recruiter owner", async () => {
    await createJob(RECRUITER_OWNER, "Acme", MINIMAL_JOB_INPUT);

    const insertCall = activeCalls.find((c) => c.method === "insert");
    const row = insertCall?.args[0] as Record<string, unknown>;
    expect(row.recruiter_id).toBe("rec_1");
    expect(row.employer_id).toBeUndefined();
  });
});

describe("updateJob / closeJob / reopenJob - ownership enforcement", () => {
  it("updateJob filters by both the job id and the caller's own employer_id", async () => {
    await updateJob(EMPLOYER_OWNER, "job_1", {
      companyName: "Acme",
      title: "New title",
    });

    const filters = eqCalls().map((c) => c.args);
    expect(filters).toContainEqual(["id", "job_1"]);
    expect(filters).toContainEqual(["employer_id", "emp_1"]);
  });

  it("updateJob filters by both the job id and the caller's own recruiter_id", async () => {
    await updateJob(RECRUITER_OWNER, "job_1", {
      companyName: "Acme",
      title: "New title",
    });

    const filters = eqCalls().map((c) => c.args);
    expect(filters).toContainEqual(["id", "job_1"]);
    expect(filters).toContainEqual(["recruiter_id", "rec_1"]);
  });

  it("updateJob throws rather than silently succeeding when the job belongs to a different owner", async () => {
    // A client-supplied jobId for someone else's job: the combined filter
    // matches zero rows, which Supabase's .single() reports as an error.
    setResult({
      data: null,
      error: { code: "PGRST116", message: "Results contain 0 rows" },
    });

    await expect(
      updateJob(EMPLOYER_OWNER, "someone-elses-job", {
        companyName: "Acme",
        title: "Hijacked",
      })
    ).rejects.toThrow();
  });

  it("closeJob scopes the update to the job id and the caller's owner column", async () => {
    setResult({ data: null, error: null });

    await closeJob(EMPLOYER_OWNER, "job_1");

    const filters = eqCalls().map((c) => c.args);
    expect(filters).toContainEqual(["id", "job_1"]);
    expect(filters).toContainEqual(["employer_id", "emp_1"]);
  });

  it("reopenJob scopes the update to the job id and the caller's owner column", async () => {
    setResult({ data: null, error: null });

    await reopenJob(RECRUITER_OWNER, "job_1");

    const filters = eqCalls().map((c) => c.args);
    expect(filters).toContainEqual(["id", "job_1"]);
    expect(filters).toContainEqual(["recruiter_id", "rec_1"]);
  });
});

describe("getOwnerJob / listOwnerJobs - read scoping", () => {
  it("getOwnerJob returns null (not another owner's job) when the combined filter matches nothing", async () => {
    setResult({ data: null, error: null });

    const result = await getOwnerJob(EMPLOYER_OWNER, "someone-elses-job");

    expect(result).toBeNull();
  });

  it("getOwnerJob filters by both the job id and the caller's own owner column", async () => {
    await getOwnerJob(EMPLOYER_OWNER, "job_1");

    const filters = eqCalls().map((c) => c.args);
    expect(filters).toContainEqual(["id", "job_1"]);
    expect(filters).toContainEqual(["employer_id", "emp_1"]);
  });

  it("listOwnerJobs filters by the caller's own owner id, never an arbitrary one", async () => {
    setResult({ data: [JOB_ROW], error: null });

    await listOwnerJobs(RECRUITER_OWNER);

    const filters = eqCalls().map((c) => c.args);
    expect(filters).toContainEqual(["recruiter_id", "rec_1"]);
  });
});
