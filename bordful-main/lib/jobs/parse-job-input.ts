import type { JobPostInput } from "@/lib/jobs/employer-job-actions";

export function parseJobInput(
  body: Record<string, unknown>
): JobPostInput | null {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!(title && description)) {
    return null;
  }

  const acceptsApplications = Boolean(body.acceptsApplications);
  const externalApplyUrl =
    typeof body.externalApplyUrl === "string"
      ? body.externalApplyUrl.trim()
      : null;
  if (!(acceptsApplications || externalApplyUrl)) {
    return null;
  }

  return {
    acceptsApplications,
    applicationRequirements:
      typeof body.applicationRequirements === "string"
        ? body.applicationRequirements.trim() || null
        : null,
    autoShortlistThreshold:
      typeof body.autoShortlistThreshold === "number"
        ? Math.min(100, Math.max(0, body.autoShortlistThreshold))
        : 70,
    benefits:
      typeof body.benefits === "string" ? body.benefits.trim() || null : null,
    careerLevel: Array.isArray(body.careerLevel)
      ? (body.careerLevel as JobPostInput["careerLevel"])
      : [],
    description,
    externalApplyUrl,
    minExperienceYears:
      typeof body.minExperienceYears === "number"
        ? body.minExperienceYears
        : null,
    requiredSkills: Array.isArray(body.requiredSkills)
      ? body.requiredSkills
          .filter((s: unknown): s is string => typeof s === "string")
          .slice(0, 30)
      : [],
    salaryCurrency:
      (body.salaryCurrency as JobPostInput["salaryCurrency"]) || "USD",
    salaryMax: typeof body.salaryMax === "number" ? body.salaryMax : null,
    salaryMin: typeof body.salaryMin === "number" ? body.salaryMin : null,
    salaryUnit: (body.salaryUnit as JobPostInput["salaryUnit"]) || "year",
    skills: typeof body.skills === "string" ? body.skills.trim() || null : null,
    title,
    type: (body.type as JobPostInput["type"]) || "Full-time",
    workplaceCity:
      typeof body.workplaceCity === "string"
        ? body.workplaceCity.trim() || null
        : null,
    workplaceCountry:
      typeof body.workplaceCountry === "string"
        ? body.workplaceCountry.trim() || null
        : null,
    workplaceType:
      (body.workplaceType as JobPostInput["workplaceType"]) || "Not specified",
  };
}

export function parseJobUpdateInput(
  body: Record<string, unknown>,
  companyName: string
): Partial<JobPostInput> & { companyName: string } {
  const patch: Partial<JobPostInput> & { companyName: string } = {
    companyName,
  };
  if (typeof body.title === "string") {
    patch.title = body.title;
  }
  if (typeof body.type === "string") {
    patch.type = body.type as JobPostInput["type"];
  }
  if (typeof body.description === "string") {
    patch.description = body.description;
  }
  if ("benefits" in body) {
    patch.benefits =
      typeof body.benefits === "string" ? body.benefits.trim() || null : null;
  }
  if ("applicationRequirements" in body) {
    patch.applicationRequirements =
      typeof body.applicationRequirements === "string"
        ? body.applicationRequirements.trim() || null
        : null;
  }
  if (typeof body.workplaceType === "string") {
    patch.workplaceType = body.workplaceType as JobPostInput["workplaceType"];
  }
  if ("workplaceCity" in body) {
    patch.workplaceCity =
      typeof body.workplaceCity === "string"
        ? body.workplaceCity.trim() || null
        : null;
  }
  if ("workplaceCountry" in body) {
    patch.workplaceCountry =
      typeof body.workplaceCountry === "string"
        ? body.workplaceCountry.trim() || null
        : null;
  }
  if (Array.isArray(body.careerLevel)) {
    patch.careerLevel = body.careerLevel as JobPostInput["careerLevel"];
  }
  if (typeof body.salaryMin === "number" || body.salaryMin === null) {
    patch.salaryMin = body.salaryMin as number | null;
  }
  if (typeof body.salaryMax === "number" || body.salaryMax === null) {
    patch.salaryMax = body.salaryMax as number | null;
  }
  if (typeof body.salaryCurrency === "string") {
    patch.salaryCurrency =
      body.salaryCurrency as JobPostInput["salaryCurrency"];
  }
  if (typeof body.salaryUnit === "string") {
    patch.salaryUnit = body.salaryUnit as JobPostInput["salaryUnit"];
  }
  if ("skills" in body) {
    patch.skills =
      typeof body.skills === "string" ? body.skills.trim() || null : null;
  }
  if (Array.isArray(body.requiredSkills)) {
    patch.requiredSkills = body.requiredSkills
      .filter((s: unknown): s is string => typeof s === "string")
      .slice(0, 30);
  }
  if (
    typeof body.minExperienceYears === "number" ||
    body.minExperienceYears === null
  ) {
    patch.minExperienceYears = body.minExperienceYears as number | null;
  }
  if (typeof body.autoShortlistThreshold === "number") {
    patch.autoShortlistThreshold = Math.min(
      100,
      Math.max(0, body.autoShortlistThreshold)
    );
  }
  if (typeof body.acceptsApplications === "boolean") {
    patch.acceptsApplications = body.acceptsApplications;
  }
  if (typeof body.externalApplyUrl === "string") {
    patch.externalApplyUrl = body.externalApplyUrl.trim();
  }

  return patch;
}
