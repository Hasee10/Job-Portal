import { Briefcase, CheckCircle2, Sparkles } from 'lucide-react';

// Guest-only hero - deliberately NOT the shared <HeroSection> component
// used everywhere else on the site (job pages, job-alerts, etc.), so this
// stays free to look completely different from the rest of the app without
// touching a component other pages depend on. Same brand gradient as
// config.ui.heroGradient (kept in sync by hand - see that config comment)
// so the color scheme still reads as one product, just a different layout/
// visual on this one page.
const BRAND_GRADIENT =
  'linear-gradient(135deg, #065C79 0%, #0982AC 50%, #0BA6DA 100%)';

export function GuestHero({
  badge,
  title,
  description,
  totalActiveJobs,
  companiesHiringCount,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  totalActiveJobs: number;
  companiesHiringCount: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden border-b"
      style={{ background: BRAND_GRADIENT }}
    >
      <div className="container relative z-10 mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-8 lg:gap-16">
          {/* Left: copy + CTA */}
          <div className="space-y-4">
            {badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 font-medium text-white text-xs backdrop-blur-sm">
                <Sparkles aria-hidden="true" className="h-3 w-3" />
                {badge}
              </span>
            )}
            <h1 className="font-bold text-3xl text-white tracking-tight sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="max-w-md text-base text-white/80">{description}</p>
            {children}
          </div>

          {/* Right: custom "product visualization" - floating cards instead
              of a generic stock photo. No real job data - purely decorative
              except the two numbers, which reuse the real counts already
              shown on the left. */}
          <div className="relative hidden h-72 md:block lg:h-80">
            <div className="absolute right-6 top-2 w-56 -rotate-3 rounded-xl border border-white/10 bg-white/95 p-4 shadow-xl backdrop-blur dark:bg-zinc-900/95">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Briefcase aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-xs text-zinc-900 dark:text-zinc-50">
                    {totalActiveJobs.toLocaleString()} open roles
                  </p>
                  <p className="text-[11px] text-zinc-500">Updated daily</p>
                </div>
              </div>
            </div>

            <div className="absolute left-4 top-20 w-52 rotate-2 rounded-xl border border-white/10 bg-white/95 p-4 shadow-xl backdrop-blur dark:bg-zinc-900/95">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-50">
                    {companiesHiringCount.toLocaleString()} companies hiring
                  </p>
                  <p className="text-[11px] text-zinc-500">Verified listings</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 right-10 w-48 -rotate-2 rounded-xl border border-white/10 bg-white/95 p-4 shadow-xl backdrop-blur dark:bg-zinc-900/95">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                    <circle
                      className="text-primary/15"
                      cx="22"
                      cy="22"
                      fill="none"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <circle
                      className="text-primary"
                      cx="22"
                      cy="22"
                      fill="none"
                      r="18"
                      stroke="currentColor"
                      strokeDasharray={2 * Math.PI * 18}
                      strokeDashoffset={2 * Math.PI * 18 * 0.08}
                      strokeLinecap="round"
                      strokeWidth="4"
                    />
                  </svg>
                  <span className="absolute font-bold text-[10px] text-primary">
                    92%
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-50">
                    AI match score
                  </p>
                  <p className="text-[11px] text-zinc-500">Based on your resume</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
