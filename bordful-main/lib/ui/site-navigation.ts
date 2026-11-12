export type SiteContext = "home" | "jobs" | "procurement";
export function siteContext(pathname: string): SiteContext {
  if (pathname === "/procurement" || pathname.startsWith("/procurement/"))
    return "procurement";
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
  )
    return "jobs";
  return "home";
}
export const SITE_LINKS = {
  home: [
    { label: "Jobs", href: "/jobs" },
    { label: "Procurement", href: "/procurement" },
    { label: "Career guides", href: "/guides" },
    { label: "About JobLo", href: "/about" },
  ],
  jobs: [
    { label: "Find jobs", href: "/jobs" },
    { label: "Job alerts", href: "/job-alerts" },
    { label: "Career guides", href: "/guides" },
    { label: "Masterclasses", href: "/masterclasses" },
    { label: "For employers", href: "/pricing" },
  ],
  procurement: [
    { label: "Overview", href: "/procurement" },
    { label: "Business directory", href: "/procurement/directory" },
    { label: "Public tenders", href: "/procurement/tenders" },
    { label: "Workspace", href: "/procurement/organizations" },
  ],
} as const;
