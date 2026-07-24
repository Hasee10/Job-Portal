import { CompanyLogoMarquee } from '@/components/home/CompanyLogoMarquee';
import type { Testimonial } from '@/lib/content/testimonial-actions';
import { getCompanyLogoUrls } from '@/lib/utils/company-logo';

export async function TrustSection({
  testimonials,
  companiesHiringCount,
  totalActiveJobs,
  featuredCompanies,
}: {
  testimonials: Testimonial[];
  companiesHiringCount: number;
  totalActiveJobs: number;
  featuredCompanies: string[];
}) {
  // Resolves real logos for as many of the real companies above as
  // Logo.dev has - anything that doesn't resolve (smaller/regional firms,
  // or the "Confidential Company" placeholder) is left out of the logo
  // slider entirely rather than shown without one.
  const logoUrls = await getCompanyLogoUrls(featuredCompanies);
  const companiesWithLogos = featuredCompanies
    .filter((company) => logoUrls.has(company))
    .map((company) => ({ name: company, logoUrl: logoUrls.get(company) as string }));

  return (
    <div className="border-t bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">
              {totalActiveJobs.toLocaleString()}
            </span>{' '}
            open roles right now, across{' '}
            <span className="font-semibold text-foreground">
              {companiesHiringCount.toLocaleString()}
            </span>{' '}
            companies currently hiring on the board.
          </p>
        </div>

        <CompanyLogoMarquee companies={companiesWithLogos} />

        {/* Falls back to the plain text list only if too few real logos
            resolved for the slider to be worth showing (e.g. Logo.dev
            isn't configured yet, or this batch of top companies happens
            to be mostly smaller/regional firms it doesn't have). */}
        {companiesWithLogos.length === 0 && featuredCompanies.length > 0 && (
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {featuredCompanies.slice(0, 8).map((company) => (
              <span className="text-muted-foreground text-sm" key={company}>
                {company}
              </span>
            ))}
          </div>
        )}

        {testimonials.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium text-sm">
              We&apos;re collecting stories from job seekers who found their
              role here.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check back soon.
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure
                className="rounded-lg border bg-background p-5"
                key={testimonial.id}
              >
                <blockquote className="text-sm">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {testimonial.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                      height={32}
                      src={testimonial.avatarUrl}
                      width={32}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-foreground"
                    >
                      {testimonial.authorName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>
                    <span className="font-medium text-foreground">
                      {testimonial.authorName}
                    </span>
                    {(testimonial.authorTitle || testimonial.authorCompany) && (
                      <>
                        {', '}
                        {[testimonial.authorTitle, testimonial.authorCompany]
                          .filter(Boolean)
                          .join(' at ')}
                      </>
                    )}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
