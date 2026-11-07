import type { CareerLevel } from "@/lib/db/airtable";

export const CAREER_LEVEL_DISPLAY_NAMES: Record<CareerLevel, string> = {
  Associate: "Associate",
  CLevel: "C-Level",
  Director: "Director",
  EntryLevel: "Entry Level",
  EVP: "EVP",
  Founder: "Founder",
  Internship: "Internship",
  Junior: "Junior",
  Lead: "Lead",
  Manager: "Manager",
  MidLevel: "Mid Level",
  NotSpecified: "Not Specified",
  Principal: "Principal",
  Senior: "Senior",
  SeniorDirector: "Senior Director",
  SeniorManager: "Senior Manager",
  Staff: "Staff",
  SVP: "SVP",
  VP: "VP",
} as const;
