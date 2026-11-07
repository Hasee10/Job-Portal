import type { Job } from "@/lib/db/airtable";

export type JobType = Job["type"];

export const JOB_TYPE_DISPLAY_NAMES: Record<JobType, string> = {
  Contract: "Contract",
  Freelance: "Freelance",
  "Full-time": "Full-time",
  "Part-time": "Part-time",
} as const;

export const JOB_TYPE_DESCRIPTIONS: Record<JobType, string> = {
  Contract: "Fixed-term or project-based positions",
  Freelance: "Self-employed or project-based contractual work",
  "Full-time": "Permanent positions with standard working hours",
  "Part-time": "Positions with reduced or flexible hours",
} as const;
