import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ArrowUpRight, Eye } from "lucide-react";
import { localBusinessPreviewHref } from "@/lib/dev/business-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Local business preview",
  robots: { index: false, follow: false },
};
const WORKSPACES = [
  {
    id: "buyer",
    name: "Demo Atlas Procurement",
    role: "Buyer",
    location: "Karachi, Pakistan",
  },
  {
    id: "supplier",
    name: "Demo Cedar Services",
    role: "Supplier",
    location: "Dubai, United Arab Emirates",
  },
  {
    id: "both",
    name: "Demo Meridian Group",
    role: "Buyer and supplier",
    location: "London, United Kingdom",
  },
];
const VIEWS = [
  "Overview",
  "Requests",
  "Connections",
  "Messages",
  "Quotations",
  "Team",
];
const ROWS: Record<
  string,
  { title: string; detail: string; status: string }[]
> = {
  Requests: [
    {
      title: "RFQ-001 · IT support framework",
      detail: "Request for quotation · Deadline in 12 days",
      status: "Published",
    },
    {
      title: "RFQ-002 · Office equipment supply",
      detail: "Request for quotation · 3 illustrative responses",
      status: "Evaluating",
    },
    {
      title: "RFP-003 · Regional logistics partner",
      detail: "Request for proposal · Draft specification",
      status: "Draft",
    },
  ],
  Connections: [
    {
      title: "Demo Harbor Technologies",
      detail: "IT services · Pakistan",
      status: "Connected",
    },
    {
      title: "Demo Summit Logistics",
      detail: "Transport services · UAE",
      status: "Pending",
    },
    {
      title: "Demo Cedar Services",
      detail: "Business services · UAE",
      status: "Connected",
    },
  ],
  Messages: [
    {
      title: "Demo Harbor Technologies",
      detail: "Can we confirm the service coverage for the next quarter?",
      status: "Sample message",
    },
    {
      title: "Demo Summit Logistics",
      detail: "We have received the requirements and are preparing a proposal.",
      status: "Sample message",
    },
  ],
  Quotations: [
    {
      title: "Demo Harbor · IT support",
      detail: "Illustrative amount: PKR 850,000 · Valid for 30 days",
      status: "Submitted",
    },
    {
      title: "Demo Cedar · Office equipment",
      detail: "Illustrative amount: AED 24,500 · Valid for 14 days",
      status: "Under review",
    },
  ],
  Team: [
    {
      title: "Demo Workspace Owner",
      detail: "Fictional team member · No account attached",
      status: "Owner",
    },
    {
      title: "Demo Procurement Manager",
      detail: "Fictional team member · No account attached",
      status: "Admin",
    },
    {
      title: "Demo Team Member",
      detail: "Fictional team member · No account attached",
      status: "Member",
    },
  ],
};
export default async function BusinessPreview({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; view?: string }>;
}) {
  if (!(await localBusinessPreviewHref())) notFound();
  const params = await searchParams;
  const workspace =
    WORKSPACES.find((entry) => entry.id === params.workspace) ?? WORKSPACES[0];
  const view = VIEWS.includes(params.view ?? "")
    ? (params.view ?? "Overview")
    : "Overview";
  const href = (nextView: string, nextWorkspace = workspace.id) =>
    `/procurement/preview?${new URLSearchParams({ workspace: nextWorkspace, view: nextView })}`;
  return (
    <main className="bg-muted/20 pb-16">
      <div className="border-b bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <p className="flex items-center gap-2 font-medium text-[#086b85] text-xs uppercase tracking-widest dark:text-cyan-200">
            <Eye size={15} aria-hidden="true" />
            Local workspace preview
          </p>
          <h1 className="mt-3 font-semibold text-3xl tracking-tight">
            Your business workspace
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            Explore the layout with fictional organizations, messages and
            procurement activity. This preview does not sign you in or send,
            submit, invite or award anything.
          </p>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4">
        <section
          className="mt-8 grid gap-4 md:grid-cols-3"
          aria-label="Example organizations"
        >
          {WORKSPACES.map((entry) => (
            <Link
              key={entry.id}
              href={href("Overview", entry.id)}
              aria-current={entry.id === workspace.id ? "page" : undefined}
              className={`rounded-2xl border bg-card p-5 ${entry.id === workspace.id ? "border-[#086b85] ring-1 ring-[#086b85]" : "hover:border-primary/50"}`}
            >
              <Building2
                className="text-muted-foreground"
                size={22}
                aria-hidden="true"
              />
              <h2 className="mt-4 font-semibold">{entry.name}</h2>
              <p className="mt-2 text-muted-foreground text-sm">{entry.role}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {entry.location}
              </p>
            </Link>
          ))}
        </section>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-xl">{workspace.name}</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {workspace.role} · Fictional workspace
            </p>
          </div>
          <Link
            href="/procurement/directory"
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm"
          >
            Browse businesses
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <nav
          aria-label="Preview workspace navigation"
          className="mt-6 flex flex-wrap gap-2 border-b pb-4"
        >
          {VIEWS.map((label) => (
            <Link
              key={label}
              aria-current={label === view ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm ${label === view ? "bg-[#086b85] text-white" : "border bg-background hover:bg-muted"}`}
              href={href(label)}
            >
              {label}
            </Link>
          ))}
        </nav>
        {view === "Overview" ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Sample requests", value: 3 },
                { label: "Business connections", value: 3 },
                { label: "Quotations to review", value: 2 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border bg-card p-6"
                >
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                  <p className="mt-3 font-semibold text-3xl">{stat.value}</p>
                  <p className="mt-2 text-muted-foreground text-xs">
                    Illustrative preview count
                  </p>
                </div>
              ))}
            </div>
            <section className="mt-6 rounded-2xl border bg-card p-6">
              <h2 className="font-semibold text-lg">Recent example activity</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li>A sample supplier connection is awaiting review.</li>
                <li>An example quotation is ready for comparison.</li>
                <li>A draft RFQ is ready for a specification review.</li>
              </ul>
            </section>
          </>
        ) : (
          <section className="mt-6 overflow-hidden rounded-2xl border bg-card">
            <div className="border-b p-6">
              <h2 className="font-semibold text-lg">{view}</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Fictional records for layout inspection. Editing and submissions
                are disabled.
              </p>
            </div>
            <ul className="divide-y">
              {(ROWS[view] ?? []).map((row) => (
                <li
                  key={row.title}
                  className="flex flex-col justify-between gap-3 p-6 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{row.title}</h3>
                    <p className="mt-2 break-words text-muted-foreground text-sm">
                      {row.detail}
                    </p>
                  </div>
                  <span className="w-fit shrink-0 rounded-full border bg-muted/40 px-3 py-1 text-xs">
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
