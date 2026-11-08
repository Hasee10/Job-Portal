import { createClient } from "@supabase/supabase-js";
import type { ScrapedJob } from "./types";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function closePool(): Promise<void> {
  // No persistent connection to close with the Supabase JS client.
}

export async function upsertJob(
  job: ScrapedJob
): Promise<"inserted" | "updated" | "skipped"> {
  const supabase = getSupabase();

  // Check by (source, job_identifier) first
  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("source", job.source)
    .eq("job_identifier", job.job_identifier)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("jobs")
      .update({
        apply_url: job.apply_url,
        company: job.company,
        title: job.title,
        ...(job.description != null && { description: job.description }),
        ...(job.type != null && { type: job.type }),
        ...(job.remote_type != null && { remote_type: job.remote_type }),
        ...(job.workplace_city != null && {
          workplace_city: job.workplace_city,
        }),
        ...(job.workplace_country != null && {
          workplace_country: job.workplace_country,
        }),
        ...(job.salary_min != null && { salary_min: job.salary_min }),
        ...(job.salary_max != null && { salary_max: job.salary_max }),
        ...(job.salary_currency != null && {
          salary_currency: job.salary_currency,
        }),
        ...(job.salary_unit != null && { salary_unit: job.salary_unit }),
        ...(job.posted_at != null && { posted_at: job.posted_at }),
        ...(job.valid_through != null && { valid_through: job.valid_through }),
        is_active: true,
      })
      .eq("source", job.source)
      .eq("job_identifier", job.job_identifier);
    return "updated";
  }

  // Check for apply_url conflict across all sources
  const { data: urlConflict } = await supabase
    .from("jobs")
    .select("id")
    .eq("apply_url", job.apply_url)
    .maybeSingle();

  if (urlConflict) {
    return "skipped";
  }

  // Fresh insert
  const { error } = await supabase.from("jobs").insert({
    apply_url: job.apply_url,
    career_level: [],
    company: job.company,
    description: job.description ?? null,
    featured: false,
    is_active: true,
    job_identifier: job.job_identifier,
    languages: [],
    posted_at: job.posted_at ?? new Date(),
    remote_region: "Worldwide",
    remote_type: job.remote_type ?? "onsite",
    salary_currency: job.salary_currency ?? "USD",
    salary_max: job.salary_max ?? null,
    salary_min: job.salary_min ?? null,
    salary_unit: job.salary_unit ?? "year",
    source: job.source,
    title: job.title,
    type: job.type ?? "Full-time",
    valid_through: job.valid_through ?? null,
    visa_sponsorship: "Not specified",
    workplace_city: job.workplace_city ?? null,
    workplace_country: job.workplace_country ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return "skipped";
    }
    throw new Error(error.message);
  }
  return "inserted";
}
