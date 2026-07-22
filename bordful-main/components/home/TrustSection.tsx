import type { Testimonial } from '@/lib/content/testimonial-actions';

export function TrustSection({
  testimonials,
  companiesHiringCount,
}: {
  testimonials: Testimonial[];
  companiesHiringCount: number;
}) {
  return (
    <div className="border-t bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-muted-foreground text-sm">
            Trusted by job seekers applying to{' '}
            <span className="font-semibold text-foreground">
              {companiesHiringCount.toLocaleString()}
            </span>{' '}
            companies currently hiring on the board.
          </p>
        </div>

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
                <figcaption className="mt-3 text-xs text-muted-foreground">
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
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
