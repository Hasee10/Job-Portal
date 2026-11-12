import { ArrowRight, Building2, Check, FileText, Network } from "lucide-react";

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
          className={styles.workflowPanel}
          aria-label="Illustrative Jobs and Procurement workflow"
        >
          <div className={styles.workflowHeader}>
            <span className={styles.dot} /> THE OPPORTUNITY NETWORK{" "}
            <span className="ml-auto text-[10px] normal-case tracking-normal">
              Illustration
            </span>
          </div>
          <div className={styles.workflowGrid}>
            {[
              {
                title: "YOUR CAREER",
                icon: FileText,
                steps: [
                  {
                    title: "Your experience",
                    detail: "Skills, resume and ambitions",
                  },
                  {
                    title: "Discover relevant roles",
                    detail: "Search, filter and shortlist",
                  },
                  {
                    title: "Take the next step",
                    detail: "Apply and track your progress",
                  },
                ],
              },
              {
                title: "YOUR BUSINESS",
                icon: Building2,
                steps: [
                  {
                    title: "Your business profile",
                    detail: "Capabilities, services and team",
                  },
                  {
                    title: "Find the right partners",
                    detail: "Discover, connect and discuss",
                  },
                  {
                    title: "Source with confidence",
                    detail: "Request, compare and award",
                  },
                ],
              },
            ].map((lane, laneIndex) => {
              const Icon = lane.icon;
              return (
                <div className={styles.workflowLane} key={lane.title}>
                  <p className={styles.workflowLabel}>{lane.title}</p>
                  {lane.steps.map((step, index) => (
                    <div key={step.title}>
                      <div
                        className={styles.workflowCard}
                        style={{
                          animationDelay: `${0.15 + index * 0.35 + laneIndex * 0.12}s`,
                        }}
                      >
                        <span className={styles.icon}>
                          {index === 0 ? (
                            <Icon size={18} aria-hidden="true" />
                          ) : index === 1 ? (
                            <Network size={18} aria-hidden="true" />
                          ) : (
                            <Check size={18} aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <strong>{step.title}</strong>
                          <small>{step.detail}</small>
                        </div>
                      </div>
                      {index < 2 && (
                        <div className={styles.workflowArrow} aria-hidden="true">
                          ↓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className={styles.workflowFooter}>
            <span>JOBS</span>
            <span className="h-px flex-1 bg-white/15" />
            <span>PROCUREMENT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
