import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleDot,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import styles from "./marketing.module.css";

/** Fictional interface composition; never reads or represents private workspace data. */
export function ProductPreview({ sourcing = false }: { sourcing?: boolean }) {
  return (
    <div
      className={styles.productFrame}
      aria-label={
        sourcing
          ? "Illustrative sourcing workspace"
          : "Illustrative opportunity workspace"
      }
    >
      <div className={styles.windowBar}>
        <span className={styles.windowDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          caliber / {sourcing ? "business workspace" : "your next chapter"}
        </span>
        <span className={styles.example}>Illustrative preview</span>
      </div>
      <div className={styles.productBody}>
        <div className={styles.productHeading}>
          <div>
            <p className={styles.micro}>
              {sourcing ? "SOURCING, CONNECTED" : "A WORLD OF POSSIBILITY"}
            </p>
            <h3>
              {sourcing
                ? "From brief to better decisions."
                : "Make room for what’s next."}
            </h3>
          </div>
          <span className={styles.previewMark}>
            <ArrowUpRight size={22} aria-hidden="true" />
          </span>
        </div>
        <div className={styles.searchVisual}>
          <Search size={15} aria-hidden="true" />
          <span>
            {sourcing
              ? "Suppliers, capabilities, opportunities"
              : "Roles, companies, possibilities"}
          </span>
        </div>
        <div className={styles.previewColumns}>
          <div>
            <p className={styles.previewLabel}>
              {sourcing ? "YOUR SOURCING PIPELINE" : "YOUR CAREER"}
            </p>
            {(sourcing
              ? [
                  [
                    "IT support framework",
                    "RFQ · Published",
                    "Collecting responses",
                  ],
                  [
                    "Office equipment supply",
                    "RFQ · Evaluation",
                    "Compare quotations",
                  ],
                  [
                    "Regional logistics partner",
                    "RFP · Draft",
                    "Define your requirements",
                  ],
                ]
              : [
                  ["Product designer", "Example Studio · Remote", "Design"],
                  [
                    "Operations manager",
                    "Example Group · Hybrid",
                    "Operations",
                  ],
                  ["Software engineer", "Example Labs · Remote", "Engineering"],
                ]
            ).map(([title, detail, tag], i) => (
              <div className={styles.previewRow} key={title}>
                <span className={styles.rowIcon}>
                  {sourcing ? (
                    <FileText size={17} aria-hidden="true" />
                  ) : (
                    <BriefcaseBusiness size={17} aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                  <span className={styles.rowTag}>{tag}</span>
                </div>
                <span className={styles.rowDot} aria-hidden="true">
                  {i === 0 ? "↗" : "·"}
                </span>
              </div>
            ))}
          </div>
          <aside className={styles.previewAside}>
            <span className={styles.asideIcon}>
              {sourcing ? (
                <ShieldCheck size={23} aria-hidden="true" />
              ) : (
                <Building2 size={23} aria-hidden="true" />
              )}
            </span>
            <p className={styles.micro}>
              {sourcing ? "KEEP THE CONTEXT" : "YOUR BUSINESS"}
            </p>
            <h4>
              {sourcing
                ? "One request. A clear record."
                : "Your next partnership starts here."}
            </h4>
            <p>
              {sourcing
                ? "Requirements, supplier responses and evaluation, brought into one workspace."
                : "Discover businesses. Start a conversation. Build something together."}
            </p>
            <div className={styles.asideLine}>
              <Check size={14} aria-hidden="true" />
              {sourcing
                ? "Membership-based access"
                : "Buyer & supplier profiles"}
            </div>
            <div className={styles.asideLine}>
              <CircleDot size={14} aria-hidden="true" />
              {sourcing
                ? "Activity stays connected"
                : "From discovery to sourcing"}
            </div>
          </aside>
        </div>
        <div className={styles.previewFoot}>
          <span className={styles.statusDot} />
          {sourcing
            ? "Discover → Connect → Request → Evaluate"
            : "Two paths. One place to move forward."}
          <span>CALIBER</span>
        </div>
      </div>
    </div>
  );
}
