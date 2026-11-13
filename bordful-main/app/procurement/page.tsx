import {
  ArrowRight,
  ArrowUpRight,
  FileSearch,
  MessagesSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import styles from "@/components/home/marketing.module.css";
import { ProductPreview } from "@/components/home/ProductPreview";
import config from "@/config";
import { getActiveTenderCount } from "@/lib/procurement/scraped-tender-actions";
export const metadata: Metadata = {
  description:
    "Discover business partners and public tenders. Bring requests, supplier responses and sourcing decisions into one workspace.",
  title: `Procurement | ${config.title}`,
};
export const dynamic = "force-dynamic";
const FORMATS = [
  {
    description:
      "Understand supplier capabilities before you commit to a specification.",
    label: "Explore the market",
    name: "RFI",
  },
  {
    description:
      "Ask for comparable quotations against a well-defined requirement.",
    label: "Compare pricing",
    name: "RFQ",
  },
  {
    description:
      "Invite proposals when the solution matters as much as the price.",
    label: "Evaluate the approach",
    name: "RFP",
  },
  {
    description: "Set formal requirements, deadlines and evaluation criteria.",
    label: "Structure the process",
    name: "Tender",
  },
];
export default async function ProcurementLandingPage() {
  const [session, totalOpenTenders] = await Promise.all([
    auth(),
    getActiveTenderCount().catch(() => null),
  ]);
  const workspaceHref = "/procurement/organizations";
  const startHref = session?.user
    ? workspaceHref
    : "/sign-up?callbackUrl=/procurement/organizations";
  return (
    <main className={styles.page}>
      <section aria-labelledby="procurement-title" className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              QUANTUS / PROCUREMENT
            </p>
            <h1 id="procurement-title">
              Good business.
              <br />
              <em>Better connected.</em>
            </h1>
            <p className={styles.heroDescription}>
              Find the right partners. Bring clarity to sourcing. Move from the
              first conversation to your next business decision, in one place.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href={workspaceHref}>
                Open procurement dashboard
                <ArrowUpRight aria-hidden="true" size={18} />
              </a>
              <Link className={styles.secondary} href="/procurement/directory">
                Explore businesses
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <div className={styles.heroNote}>
              <span>FOR BUYERS</span>
              <span>FOR SUPPLIERS</span>
              <span>FOR WHAT’S NEXT</span>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <ProductPreview sourcing />
            <div className={styles.visualCaption}>
              <span>From requirements to responses.</span>
              <strong>Keep the bigger picture.</strong>
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="discovery-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>OPEN THE RIGHT DOORS</p>
            <h2 id="discovery-title">
              Your next opportunity
              <br />
              could start here.
            </h2>
          </div>
          <p className={styles.intro}>
            Explore the public marketplace before you start sourcing. No
            business workspace required to browse.
          </p>
        </div>
        <div className={styles.discovery}>
          <div>
            <FileSearch aria-hidden="true" size={26} />
            {totalOpenTenders === null ? (
              <h3 className="mt-6">
                Public opportunities.
                <br />A wider perspective.
              </h3>
            ) : (
              <>
                <div className={styles.tenderCount}>
                  {totalOpenTenders.toLocaleString()}
                </div>
                <h3>Open tenders to explore.</h3>
              </>
            )}
            <p>
              Browse aggregated public notices from TED and PPRA.
              <small>
                Check the original source for current requirements and
                deadlines.
              </small>
            </p>
            <Link className={styles.textLink} href="/procurement/tenders">
              Browse public tenders
              <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <div>
            <Users aria-hidden="true" size={26} />
            <h3 className="mt-6">
              Find a business.
              <br />
              Start a relationship.
            </h3>
            <p>
              Discover buyers and suppliers by category, location and
              capabilities. Get a clearer picture of who you could work with.
            </p>
            <p className="text-muted-foreground text-xs">
              Business information is self-declared, not independently verified.
            </p>
            <Link className={styles.textLink} href="/procurement/directory">
              Explore the directory
              <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section aria-labelledby="workspace-title" className={styles.band}>
        <div className={styles.bandInner}>
          <div>
            <p className={styles.kicker}>WORK TOGETHER. WITH CONTEXT.</p>
            <h2 id="workspace-title">
              A workspace for the
              <br />
              whole conversation.
            </h2>
            <p>
              Move beyond scattered messages and documents. Give each business
              relationship a place to develop.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-3 border-white/40 border-b pb-2 text-sm"
              href={workspaceHref}
            >
              Explore your workspace
              <ArrowUpRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <div className={styles.benefitGrid}>
            {[
              {
                icon: Users,
                text: "Build a network around your organization, not a disconnected contact list.",
                title: "Business connections",
              },
              {
                icon: MessagesSquare,
                text: "Keep conversations tied to the businesses you work with.",
                title: "Shared context",
              },
              {
                icon: FileSearch,
                text: "Bring requirements and supplier responses into a clear sourcing process.",
                title: "Structured requests",
              },
              {
                icon: ShieldCheck,
                text: "Your organization’s workspace stays scoped to its members and permissions.",
                title: "Membership-based access",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon aria-hidden="true" size={22} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section aria-labelledby="formats-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>THE RIGHT STARTING POINT</p>
            <h2 id="formats-title">
              Different needs.
              <br />A more considered process.
            </h2>
          </div>
          <p className={styles.intro}>
            Choose the request format around the decision you need to make.
          </p>
        </div>
        <div className={styles.formats}>
          {FORMATS.map((f, i) => (
            <article className={styles.format} key={f.name}>
              <small>
                0{i + 1} / {f.label.toUpperCase()}
              </small>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y bg-muted/20">
        <div className={styles.section}>
          <div className={styles.process}>
            <div>
              <p className={styles.kicker}>FROM BRIEF TO DECISION</p>
              <h2>
                A clear next step.
                <br />
                At every stage.
              </h2>
              <p className={`${styles.intro} mt-5`}>
                Start with the requirement. Keep suppliers and evaluation
                connected as the process moves forward.
              </p>
            </div>
            <ol>
              {[
                {
                  text: "Choose a format, describe the requirement, and set your deadline and evaluation criteria.",
                  title: "Define what you need",
                },
                {
                  text: "Invite suppliers and collect responses in the context of your request.",
                  title: "Bring the right suppliers in",
                },
                {
                  text: "Review submissions, evaluate your options and keep a record of the decision.",
                  title: "Compare, decide and record",
                },
              ].map((step, i) => (
                <li key={step.title}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <section aria-labelledby="roles-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>TWO SIDES. SHARED PROGRESS.</p>
            <h2 id="roles-title">Built for the way you do business.</h2>
          </div>
        </div>
        <div className={styles.resources}>
          <article className={styles.resource}>
            <span className={styles.resourceNumber}>B</span>
            <div>
              <h3>For buyers</h3>
              <p>
                Discover partners, organize your requirements and give sourcing
                decisions a clearer foundation.
              </p>
              <Link className={styles.textLink} href={startHref}>
                Start your business profile
                <ArrowUpRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </article>
          <article className={styles.resource}>
            <span className={styles.resourceNumber}>S</span>
            <div>
              <h3>For suppliers</h3>
              <p>
                Make your capabilities visible. Build connections and respond to
                invitations from your business workspace.
              </p>
              <Link
                className={styles.textLink}
                href={
                  session?.user
                    ? workspaceHref
                    : "/sign-in?callbackUrl=/procurement/organizations"
                }
              >
                Open your business workspace
                <ArrowUpRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
