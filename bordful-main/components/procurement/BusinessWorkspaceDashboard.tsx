import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Network,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { listConnections } from "@/lib/procurement/connection-actions";
import { listMessages } from "@/lib/procurement/message-actions";
import {
  listOrganizationMembers,
  type listOrganizationsWithAttention,
  type OrganizationMemberRef,
} from "@/lib/procurement/organization-actions";
import { listOrganizationResponsesForRequest } from "@/lib/procurement/organization-response-actions";
import {
  listOrganizationRequests,
  listSupplierOpportunities,
} from "@/lib/procurement/organization-rfq-actions";

const VIEWS = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Requests", icon: FileText },
  { label: "Connections", icon: Network },
  { label: "Messages", icon: MessageSquare },
  { label: "Quotations", icon: Wallet },
  { label: "Team", icon: Users },
];
interface WorkspaceRow {
  id: string;
  title: string;
  detail: string;
  status: string;
  href: string;
}
interface DashboardProps {
  member: OrganizationMemberRef;
  organizations: Awaited<ReturnType<typeof listOrganizationsWithAttention>>;
  workspace?: string;
  view?: string;
  isPresentation: boolean;
}
function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}
function WorkspaceRows({ rows }: { rows: WorkspaceRow[] }) {
  if (rows.length === 0)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No records here yet. Your business activity will appear here as you
        work.
      </p>
    );
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={row.href}
            className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <FileText size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-medium text-sm">
                {row.title}
              </span>
              <span className="mt-2 block break-words text-sm text-muted-foreground leading-6">
                {row.detail}
              </span>
            </span>
            <span
              className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs capitalize ${["accepted", "published", "awarded", "submitted"].includes(row.status) ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-muted text-foreground"}`}
            >
              {statusLabel(row.status)}
            </span>
            <ArrowUpRight
              className="hidden shrink-0 text-muted-foreground sm:block"
              size={15}
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function BusinessWorkspaceDashboard({
  member,
  organizations,
  workspace,
  view: requestedView,
  isPresentation,
}: DashboardProps) {
  const organization =
    organizations.find((entry) => entry.id === workspace) ?? organizations[0];
  if (!organization) return null;
  const view =
    VIEWS.find((entry) => entry.label === requestedView)?.label ?? "Overview";
  const base = `/procurement/organizations/${organization.id}`;
  const href = (nextView: string, nextWorkspace = organization.id) =>
    `/procurement/organizations?${new URLSearchParams({ workspace: nextWorkspace, view: nextView })}`;
  const roleLabel =
    organization.isBuyer && organization.isSupplier
      ? "Buyer and supplier"
      : organization.isBuyer
        ? "Buyer"
        : "Supplier";
  const [requests, opportunities, connections] = await Promise.all([
    organization.isBuyer
      ? listOrganizationRequests(member, organization.id)
      : Promise.resolve([]),
    organization.isSupplier
      ? listSupplierOpportunities(member, organization.id)
      : Promise.resolve([]),
    listConnections(member, organization.id),
  ]);
  const requestRows: WorkspaceRow[] = requests.map((request) => ({
    id: request.id,
    title: request.title,
    detail: `${request.type.toUpperCase()} · ${request.category}`,
    status: request.status,
    href: `${base}/requests/${request.id}`,
  }));
  if (!organization.isBuyer)
    requestRows.push(
      ...opportunities.map((entry) => ({
        id: entry.request.id,
        title: entry.request.title,
        detail: `${entry.request.type.toUpperCase()} · ${entry.request.category}`,
        status: entry.invitationStatus,
        href: `${base}/opportunities/${entry.request.id}`,
      }))
    );
  const allConnections = [
    ...connections.incoming,
    ...connections.outgoing,
    ...connections.accepted,
    ...connections.rejected,
  ];
  let rows = requestRows;
  if (view === "Connections")
    rows = allConnections.map((connection) => ({
      id: connection.id,
      title: connection.counterpart?.name ?? "Business partner",
      detail: `${connection.isBuyer ? "Buying from" : "Supplying"} · ${connection.counterpart?.location ?? "Business connection"}`,
      status: connection.status,
      href:
        connection.status === "accepted"
          ? `${base}/connections/${connection.id}`
          : base,
    }));
  if (view === "Messages") {
    const conversations = await Promise.all(
      connections.accepted.slice(0, 16).map(async (connection) => {
        const page = await listMessages(member, organization.id, connection.id);
        const latestPage =
          page.pageCount > 1
            ? await listMessages(
                member,
                organization.id,
                connection.id,
                page.pageCount
              )
            : page;
        const latest = latestPage.messages.at(-1);
        return {
          id: connection.id,
          title: connection.counterpart?.name ?? "Business partner",
          detail: latest?.body ?? "Start a conversation with this business.",
          status: `${page.total} messages`,
          href: `${base}/connections/${connection.id}`,
          updatedAt: latest?.createdAt ?? connection.createdAt,
        };
      })
    );
    rows = conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  if (view === "Quotations") {
    const quotations = await Promise.all(
      requests
        .filter((request) => request.status !== "draft")
        .slice(0, 12)
        .map(async (request) => {
          const result = await listOrganizationResponsesForRequest(
            member,
            organization.id,
            request.id
          );
          if (result.sealed)
            return [
              {
                id: request.id,
                title: request.title,
                detail: `${result.count} sealed quotations · Open the request to manage bid opening.`,
                status: "sealed",
                href: `${base}/requests/${request.id}`,
              },
            ];
          return result.responses.map((response) => ({
            id: response.id,
            title: response.supplierOrgName ?? "Supplier quotation",
            detail: `${request.title} · ${String(response.pricing?.currency ?? "")} ${String(response.pricing?.amount ?? "Price on proposal")}`,
            status: response.isWithdrawn ? "withdrawn" : "submitted",
            href: `${base}/requests/${request.id}`,
          }));
        })
    );
    rows = quotations.flat();
    if (!organization.isBuyer)
      rows = opportunities.map((entry) => ({
        id: entry.request.id,
        title: entry.request.title,
        detail: "Review your quotation and its current outcome.",
        status: entry.invitationStatus,
        href: `${base}/opportunities/${entry.request.id}`,
      }));
  }
  if (view === "Team") {
    const members = await listOrganizationMembers(member, organization.id);
    rows = members.map((entry) => ({
      id: entry.id,
      title:
        entry.memberId === member.memberId &&
        entry.memberType === member.memberType
          ? "You"
          : "Business team member",
      detail: "Manage membership and invitations in business settings.",
      status: entry.role,
      href: base,
    }));
  }
  const stats = [
    {
      label: organization.isBuyer
        ? "Procurement requests"
        : "Supplier opportunities",
      value: requestRows.length,
      view: "Requests",
      icon: FileText,
    },
    {
      label: "Business connections",
      value: connections.accepted.length,
      view: "Connections",
      icon: Network,
    },
    {
      label: "Quotations to review",
      value: organization.attention.pendingQuotations,
      view: "Quotations",
      icon: Wallet,
    },
  ];
  const pipeline = [
    { label: "Draft", status: "draft", color: "bg-slate-400" },
    { label: "Published", status: "published", color: "bg-primary" },
    { label: "Evaluating", status: "evaluating", color: "bg-amber-400" },
    { label: "Awarded", status: "awarded", color: "bg-emerald-500" },
  ].map((stage) => ({
    ...stage,
    count: requestRows.filter((row) => row.status === stage.status).length,
  }));
  const pipelineTotal = pipeline.reduce((sum, stage) => sum + stage.count, 0);
  return (
    <main className="bg-muted/25 pb-14">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              BUSINESS WORKSPACE / {view}
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
              {organization.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your sourcing activity, partnerships and team. One organized
              workspace.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            href="/procurement/directory"
          >
            Explore business partners
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {isPresentation && (
          <p className="mb-6 flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-xs text-muted-foreground">
            <CheckCircle2 size={15} className="shrink-0" aria-hidden="true" />
            Local testing workspace · Fictional presentation data. Actions use
            your local database.
          </p>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl bg-[var(--brand-panel)] p-4 text-white lg:sticky lg:top-24">
            <details className="rounded-xl border border-white/20 bg-white/5">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                <Building2
                  size={20}
                  className="shrink-0 text-[var(--brand-highlight)]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {organization.name}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--brand-soft-text)]">
                    {roleLabel}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className="shrink-0"
                  aria-hidden="true"
                />
              </summary>
              <div className="space-y-1 border-t border-white/15 p-2">
                {organizations.map((entry) => (
                  <Link
                    key={entry.id}
                    className="block break-words rounded-lg px-2 py-3 text-sm hover:bg-white/10"
                    href={href("Overview", entry.id)}
                  >
                    {entry.name}
                  </Link>
                ))}
              </div>
            </details>
            <p className="mb-3 mt-6 px-3 text-[10px] uppercase tracking-widest text-[var(--brand-soft-text)]">
              WORKSPACE
            </p>
            <nav
              aria-label="Business workspace"
              className="flex flex-wrap gap-1 lg:flex-col"
            >
              {VIEWS.map(({ label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href(label)}
                  aria-current={label === view ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${label === view ? "bg-[var(--brand-highlight)] font-medium text-[var(--brand-ink)]" : "text-[var(--brand-soft-text)] hover:bg-white/10"}`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label === "Requests" && !organization.isBuyer
                    ? "Opportunities"
                    : label}
                </Link>
              ))}
              <Link
                className="block rounded-lg border-t border-white/15 px-2 py-3 text-sm text-[var(--brand-highlight)] hover:bg-white/10"
                href="/procurement/organizations?view=Create"
              >
                Add another business
              </Link>
            </nav>
            <div className="mt-7 hidden border-t border-white/15 px-3 pt-5 lg:block">
              <p className="text-xs text-[var(--brand-soft-text)]">Acting as</p>
              <p className="mt-2 text-sm font-medium">{roleLabel}</p>
              <p className="mt-1 text-xs text-[var(--brand-soft-text)]">
                {organization.location}
              </p>
              <Link className="mt-4 inline-block text-xs underline" href={base}>
                Business settings & team
              </Link>
            </div>
          </aside>
          <div className="min-w-0 space-y-6">
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
                          className="text-primary"
                          aria-hidden="true"
                        />
                        <ArrowUpRight
                          size={15}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-5 text-3xl font-semibold">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </Link>
                  ))}
                </div>
                <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                  <section className="rounded-2xl border bg-card p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold">
                        Request pipeline
                      </h2>
                      <Link
                        href={href("Requests")}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      From the first brief to your next sourcing decision.
                    </p>
                    <div
                      className="mt-6 flex h-3 overflow-hidden rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      {pipeline.map((stage) => (
                        <span
                          key={stage.status}
                          className={stage.color}
                          style={{
                            width: `${pipelineTotal ? (stage.count / pipelineTotal) * 100 : 0}%`,
                          }}
                        />
                      ))}
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {pipeline.map((stage) => (
                        <div key={stage.status}>
                          <dt className="text-xs text-muted-foreground">
                            {stage.label}
                          </dt>
                          <dd className="mt-2 text-xl font-semibold">
                            {stage.count}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  <section className="rounded-2xl border bg-card p-6">
                    <h2 className="text-lg font-semibold">
                      Needs your attention
                    </h2>
                    <div className="mt-5 space-y-4">
                      {[
                        {
                          label: "Connection requests",
                          count: organization.attention.pendingConnections,
                          view: "Connections",
                        },
                        {
                          label: "Supplier invitations",
                          count: organization.attention.openInvitations,
                          view: "Requests",
                        },
                        {
                          label: "Quotations to review",
                          count: organization.attention.pendingQuotations,
                          view: "Quotations",
                        },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={
                            item.view === "Requests"
                              ? `${base}/opportunities`
                              : href(item.view)
                          }
                          className="flex items-center gap-3 text-sm"
                        >
                          <Clock3
                            size={16}
                            className="shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span className="flex-1">{item.label}</span>
                          <span className="font-semibold">{item.count}</span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
                <section className="overflow-hidden rounded-2xl border bg-card">
                  <div className="flex items-center justify-between gap-3 border-b p-6">
                    <div>
                      <h2 className="text-lg font-semibold">Recent requests</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your latest procurement activity.
                      </p>
                    </div>
                    <Link
                      href={href("Requests")}
                      className="shrink-0 text-xs text-muted-foreground hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <WorkspaceRows rows={requestRows.slice(0, 5)} />
                </section>
              </>
            ) : (
              <section className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {roleLabel} WORKSPACE
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{view}</h2>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {view === "Messages"
                        ? "Recent conversations with your connected businesses."
                        : "Open a record to review details and manage the next step."}
                    </p>
                  </div>
                  <span className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                    {rows.length} records
                  </span>
                </div>
                <WorkspaceRows rows={rows} />
                <div className="border-t p-5">
                  <Link
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                    href={view === "Requests" ? `${base}/requests` : base}
                  >
                    Manage {view.toLowerCase()}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
