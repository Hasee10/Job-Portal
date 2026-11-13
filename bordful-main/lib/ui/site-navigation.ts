export type SiteContext = "home" | "jobs" | "procurement";
export function siteContext(pathname: string): SiteContext {
  if (pathname === "/procurement" || pathname.startsWith("/procurement/")) {
    return "procurement";
  }
  if (
    [
      "/jobs",
      "/account",
      "/recruiter",
      "/dashboard",
      "/guides",
      "/masterclasses",
      "/job-alerts",
      "/pricing",
    ].some((root) => pathname === root || pathname.startsWith(`${root}/`))
  ) {
    return "jobs";
  }
  return "home";
}
export const SITE_LINKS = {
  home: [
    { href: "/jobs", label: "Jobs" },
    { href: "/procurement", label: "Procurement" },
    { href: "/guides", label: "Career guides" },
    { href: "/contact", label: "Contact" },
  ],
  jobs: [
    { href: "/jobs", label: "Find jobs" },
    { href: "/job-alerts", label: "Job alerts" },
    { href: "/guides", label: "Career guides" },
    { href: "/masterclasses", label: "Masterclasses" },
    { href: "/pricing", label: "For employers" },
  ],
  procurement: [
    { href: "/procurement", label: "Overview" },
    { href: "/procurement/directory", label: "Business directory" },
    { href: "/procurement/tenders", label: "Public tenders" },
    { href: "/procurement/organizations", label: "Procurement dashboard" },
  ],
} as const;
