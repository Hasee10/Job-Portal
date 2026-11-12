import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ProductPreview } from "./ProductPreview";
import styles from "./marketing.module.css";
export function GuestHero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroGrid}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span />
            AMBITION MEETS OPPORTUNITY
          </p>
          <h1 id="landing-title">
            Your next opportunity.
            <br />
            <em>Your next connection.</em>
          </h1>
          <p className={styles.heroDescription}>
            A career worth pursuing. A partnership worth building. Find your
            next move with Caliber.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/jobs">
              Explore Jobs <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link className={styles.secondary} href="/procurement">
              Explore Procurement <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.heroNote}>
            <span>01 / CAREERS</span>
            <span>02 / BUSINESS</span>
            <span>BUILT AROUND YOU</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <ProductPreview />
          <div className={styles.visualCaption}>
            <span>Less searching in circles.</span>
            <strong>More moving forward.</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
