import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  FileText,
  Network,
} from "lucide-react";

import Link from "next/link";

import styles from "./landing.module.css";

// The illustration is HTML, not a video or animation dependency. The entrance

// sequence finishes in under five seconds and respects reduced motion.

export function GuestHero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className="container mx-auto grid items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.dot} /> TWO PATHS. MORE POSSIBILITIES.
          </p>
          <h1
            id="landing-title"
            className="mt-6 max-w-xl font-semibold text-4xl leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl"
          >
            Your next opportunity.
            <br />
            <span className={styles.accent}>Your next connection.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
            Move your career forward with Jobs. Build business relationships and
            source with confidence through Procurement.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className={styles.primary} href="/jobs">
              Explore Jobs <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link className={styles.secondary} href="/procurement">
              Explore Procurement <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/60">
            For individuals. For businesses. Built around your next step.
          </p>
        </div>
        <div
          className={styles.preview}
          aria-label="Illustrative Jobs and Procurement workflow"
        >
          <div className={styles.previewTop}>
            <span className={styles.dot} /> THE OPPORTUNITY NETWORK{" "}
            <span className="ml-auto text-[10px] normal-case tracking-normal">
              Illustration
            </span>
          </div>
          <div className={styles.network}>
            <div className={`${styles.flowCard} ${styles.profile}`}>
              <span className={styles.icon}>
                <FileText size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>Your experience</strong>
                <small>Skills · Resume · Ambitions</small>
              </div>
            </div>
            <div className={`${styles.flowCard} ${styles.business}`}>
              <span className={styles.icon}>
                <Building2 size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>Your business</strong>
                <small>Profile · Capabilities · Team</small>
              </div>
            </div>
            <div className={styles.connector} aria-hidden="true" />
            <div className={styles.hub}>
              <Network size={27} aria-hidden="true" />
              <span>Connect</span>
            </div>
            <div className={`${styles.flowCard} ${styles.jobs}`}>
              <BriefcaseBusiness size={19} aria-hidden="true" />
              <div>
                <strong>Find your next role</strong>
                <small>Discover. Save. Apply.</small>
              </div>
              <Check
                size={15}
                className="ml-auto text-emerald-600"
                aria-hidden="true"
              />
            </div>
            <div className={`${styles.flowCard} ${styles.procurement}`}>
              <Building2 size={19} aria-hidden="true" />
              <div>
                <strong>Build your next partnership</strong>
                <small>Discover. Connect. Source.</small>
              </div>
              <Check
                size={15}
                className="ml-auto text-emerald-600"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className={styles.previewBottom}>
            <span>JOBS</span>
            <span className="h-px flex-1 bg-white/15" />
            <span>PROCUREMENT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
