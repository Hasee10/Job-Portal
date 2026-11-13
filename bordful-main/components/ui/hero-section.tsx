import Image from "next/image";
type HeroImageConfig = { enabled?: boolean; src?: string; alt?: string };
type HeroSectionProps = {
  badge: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  heroImage?: HeroImageConfig;
};
/** Shared page introduction; every route uses the Quantus surface and ink tokens. */
export function HeroSection({
  badge,
  title,
  description,
  children,
  heroImage,
}: HeroSectionProps) {
  return (
    <section className="border-b bg-[var(--hero-surface)] text-[var(--hero-ink)]">
      <div className="container mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div
          className={`grid items-center gap-10 ${heroImage?.enabled && heroImage.src ? "md:grid-cols-[1.25fr_1fr]" : ""}`}
        >
          <div className="space-y-5">
            {badge && (
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--hero-muted)]">
                QUANTUS / {badge}
              </p>
            )}
            <h1 className="max-w-3xl text-3xl font-medium leading-[1.12] tracking-[-.04em] sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--hero-muted)] sm:text-base">
              {description}
            </p>
            {children && <div className="pt-2">{children}</div>}
          </div>
          {heroImage?.enabled && heroImage.src && (
            <Image
              alt={heroImage.alt || ""}
              src={heroImage.src}
              width={500}
              height={350}
              className="hidden w-full rounded-2xl object-cover md:block"
            />
          )}
        </div>
      </div>
    </section>
  );
}
