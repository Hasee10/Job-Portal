import Link from "next/link";
export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="JobLo home"
      className={`inline-flex shrink-0 items-center gap-2.5 ${inverted ? "text-white" : "text-foreground"}`}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="11" fill="#086B85" />
        <path
          d="M12 12h13v12M25 12l-9 9c-4 4-9 1-7-3"
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="27" r="2" fill="#A7E8D3" />
      </svg>
      <span className="font-semibold text-2xl tracking-[-.06em]">
        Job
        <span
          className={
            inverted ? "text-[#A7E8D3]" : "text-[#086b85] dark:text-cyan-200"
          }
        >
          Lo
        </span>
      </span>
    </Link>
  );
}
