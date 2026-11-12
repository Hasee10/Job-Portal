import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ArrowUpRight,
  Eye,
  LayoutDashboard,
  FileText,
  Network,
  MessageSquare,
  Wallet,
  Users,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { localBusinessPreviewHref } from "@/lib/dev/business-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Workspace preview | Caliber",
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
  const icons: Record<string, typeof Building2> = {
    Overview: LayoutDashboard,
    Requests: FileText,
    Connections: Network,
    Messages: MessageSquare,
    Quotations: Wallet,
    Team: Users,
  };
  const viewLabel = (label: string) =>
    label === "Requests" && workspace.id === "supplier"
      ? "Opportunities"
      : label;
  const stats = [
    {
      label:
        workspace.id === "supplier"
          ? "Sample opportunities"
          : "Sample requests",
      value: ROWS.Requests.length,
      view: "Requests",
      icon: FileText,
    },
    {
      label: "Business connections",
      value: ROWS.Connections.length,
      view: "Connections",
      icon: Network,
    },
    {
      label: "Quotations to review",
      value: ROWS.Quotations.length,
      view: "Quotations",
      icon: Wallet,
    },
  ];
  return (
    <main className="bg-muted/25 pb-14">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">
              BUSINESS WORKSPACE / {viewLabel(view)}
            </p>
            <h1 className="mt-2 font-semibold text-3xl tracking-tight">
              {workspace.name.replace("Demo ", "")}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Your sourcing activity, partnerships and team. One organized
              workspace.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-[#086b85] px-4 py-3 font-medium text-white text-sm hover:bg-[#07576d]"
            href="/procurement/directory"
          >
            Explore business partners
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="mb-6 flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-muted-foreground text-xs">
          <Eye size={15} className="shrink-0" aria-hidden="true" />
          Read-only local preview. All organizations, records and activity below
          are fictional.
        </p>
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-[#0a3342] p-4 text-white lg:sticky lg:top-24">
            <details className="rounded-xl border border-white/20 bg-white/5">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                <Building2
                  size={20}
                  className="shrink-0 text-[#A7E8D3]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-sm">
                    {workspace.name.replace("Demo ", "")}
                  </span>
                  <span className="mt-1 block text-[#bdd0d7] text-xs">
                    {workspace.role}
                  </span>
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <div className="space-y-1 border-t border-white/15 p-2">
                {WORKSPACES.map((entry) => (
                  <Link
                    key={entry.id}
                    className="block rounded-lg px-2 py-3 text-sm hover:bg-white/10"
                    href={href("Overview", entry.id)}
                  >
                    {entry.name.replace("Demo ", "")}
                    <span className="mt-1 block text-[#bdd0d7] text-xs">
                      {entry.role}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
            <p className="mb-3 mt-6 px-3 text-[#bdd0d7] text-[10px] uppercase tracking-widest">
              WORKSPACE
            </p>
            <nav
              aria-label="Preview workspace navigation"
              className="flex flex-wrap gap-1 lg:flex-col"
            >
              {VIEWS.map((label) => {
                const Icon = icons[label];
                return (
                  <Link
                    key={label}
                    href={href(label)}
                    aria-current={label === view ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${label === view ? "bg-[#B3EDDA] font-medium text-[#103d40]" : "text-[#d1e0e6] hover:bg-white/10"}`}
                  >
                    <Icon size={17} aria-hidden="true" />
                    {viewLabel(label)}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-7 hidden border-t border-white/15 px-3 pt-5 lg:block">
              <p className="text-[#bdd0d7] text-xs">Acting as</p>
              <p className="mt-2 font-medium text-sm">{workspace.role}</p>
              <p className="mt-1 text-[#bdd0d7] text-xs">
                {workspace.location}
              </p>
            </div>
          </aside>
          <div className="min-w-0">
            {view === "Overview" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {stats.map((stat) => (
                    <Link
                      key={stat.view}
                      href={href(stat.view)}
                      className="rounded-2xl border bg-card p-5 hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between">
                        <stat.icon
                          size={19}
                          className="text-[#086b85] dark:text-cyan-200"
                          aria-hidden="true"
                        />
                        <ArrowUpRight
                          size={15}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-5 font-semibold text-3xl">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-muted-foreground text-xs">
                        {stat.label}
                      </p>
                    </Link>
                  ))}
                </div>
                <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                  <section className="rounded-2xl border bg-card p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">
                        {workspace.id === "supplier"
                          ? "Opportunity pipeline"
                          : "Request pipeline"}
                      </h2>
                      <Link
                        href={href("Requests")}
                        className="text-muted-foreground text-xs hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    <p className="mt-2 text-muted-foreground text-sm">
                      A snapshot of your example sourcing activity.
                    </p>
                    <div
                      className="mt-6 flex h-3 overflow-hidden rounded-full"
                      aria-hidden="true"
                    >
                      {["bg-slate-400", "bg-[#086b85]", "bg-amber-400"].map(
                        (color) => (
                          <span key={color} className={`w-1/3 ${color}`} />
                        )
                      )}
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                      {["Draft", "Published", "Evaluating"].map((status) => (
                        <div key={status}>
                          <p className="text-muted-foreground">{status}</p>
                          <p className="mt-2 font-semibold text-xl">
                            {
                              ROWS.Requests.filter(
                                (row) => row.status === status
                              ).length
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 space-y-3 border-t pt-5">
                      {ROWS.Requests.slice(0, 2).map((row) => (
                        <Link
                          key={row.title}
                          href={href("Requests")}
                          className="flex items-start gap-3 text-sm"
                        >
                          <FileText
                            size={17}
                            className="mt-0.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {row.title}
                            </span>
                            <span className="mt-1 block text-muted-foreground text-xs">
                              {row.status}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-2xl border bg-card p-6">
                    <p className="flex items-center gap-2 text-amber-800 text-xs dark:text-amber-200">
                      <Clock3 size={15} aria-hidden="true" />
                      NEEDS A LOOK
                    </p>
                    <h2 className="mt-3 font-semibold text-lg">
                      Keep things moving
                    </h2>
                    <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                      A focused list of next steps in this sample workspace.
                    </p>
                    {[
                      {
                        label: "Review supplier connection",
                        detail: "One example request is pending.",
                        target: "Connections",
                      },
                      {
                        label: "Compare quotations",
                        detail: "Two example submissions are ready.",
                        target: "Quotations",
                      },
                    ].map((item) => (
                      <Link
                        key={item.target}
                        href={href(item.target)}
                        className="mt-4 block rounded-xl border p-4 hover:bg-muted/50"
                      >
                        <span className="flex items-center justify-between gap-2 font-medium text-sm">
                          {item.label}
                          <ArrowRight size={15} aria-hidden="true" />
                        </span>
                        <span className="mt-2 block text-muted-foreground text-xs">
                          {item.detail}
                        </span>
                      </Link>
                    ))}
                  </section>
                </div>
                <section className="mt-6 rounded-2xl border bg-card p-6">
                  <h2 className="font-semibold text-lg">Workspace activity</h2>
                  <p className="mt-2 text-muted-foreground text-xs">
                    Illustrative activity, not a live audit log.
                  </p>
                  <ul className="mt-5 divide-y">
                    {[
                      "A sample supplier connection is waiting for review.",
                      "An example quotation was added to the review queue.",
                      "A draft request has a specification ready to review.",
                    ].map((activity) => (
                      <li
                        key={activity}
                        className="flex items-start gap-3 py-4 text-sm"
                      >
                        <CheckCircle2
                          size={17}
                          className="mt-0.5 shrink-0 text-[#086b85] dark:text-cyan-200"
                          aria-hidden="true"
                        />
                        {activity}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : (
              <section className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex items-start justify-between gap-4 border-b p-6">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest">
                      {workspace.role} WORKSPACE
                    </p>
                    <h2 className="mt-2 font-semibold text-2xl">
                      {viewLabel(view)}
                    </h2>
                    <p className="mt-3 text-muted-foreground text-sm">
                      Example records for layout inspection. Editing is
                      disabled.
                    </p>
                  </div>
                  <span className="rounded-lg border px-3 py-2 text-muted-foreground text-xs">
                    {(ROWS[view] ?? []).length} records
                  </span>
                </div>
                <ul className="divide-y">
                  {(ROWS[view] ?? []).map((row, index) => {
                    const Icon = icons[view];
                    return (
                      <li
                        key={row.title}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-[#086b85] dark:text-cyan-200">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                            EXAMPLE {String(index + 1).padStart(2, "0")}
                          </p>
                          <h3 className="mt-1.5 font-medium text-sm">
                            {row.title}
                          </h3>
                          <p className="mt-2 break-words text-muted-foreground text-sm leading-6">
                            {row.detail}
                          </p>
                        </div>
                        <span
                          className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs ${["Connected", "Published", "Submitted"].includes(row.status) ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-muted text-foreground"}`}
                        >
                          {row.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
