import Image from 'next/image';

type CompanyLogo = {
  name: string;
  logoUrl: string;
};

// Below this, a looping marquee looks sparse/awkward rather than
// impressive - just skip the section entirely rather than force it.
const MIN_LOGOS_TO_SHOW = 6;

// Roughly constant scroll speed regardless of how many logos actually
// resolved, instead of a fixed duration that'd crawl with few logos or
// rush with many.
const SECONDS_PER_LOGO = 2.5;

export function CompanyLogoMarquee({ companies }: { companies: CompanyLogo[] }) {
  if (companies.length < MIN_LOGOS_TO_SHOW) return null;

  // Duplicated so the strip can loop seamlessly: animating the combined
  // track exactly -50% lines the second copy up perfectly where the first
  // one started.
  const track = [...companies, ...companies];
  const durationSeconds = companies.length * SECONDS_PER_LOGO;

  return (
    <div
      className="relative mx-auto mt-8 max-w-4xl overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div
        className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {track.map((company, index) => (
          <div
            aria-hidden={index >= companies.length}
            className="flex shrink-0 items-center gap-2.5"
            key={`${company.name}-${index}`}
          >
            <Image
              alt=""
              className="rounded-md object-contain grayscale transition-[filter] hover:grayscale-0"
              height={36}
              src={company.logoUrl}
              unoptimized
              width={36}
            />
            <span className="whitespace-nowrap font-medium text-muted-foreground text-sm">
              {company.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
