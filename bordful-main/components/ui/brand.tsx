import Link from "next/link";
export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Caliber home"
      className={`inline-flex shrink-0 items-center gap-2 ${inverted ? "text-white" : "text-[#102f40] dark:text-white"}`}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <title>Caliber symbol</title>
        <path
          d="M27 10a12 12 0 1 0 0 20"
          stroke={inverted ? "#B3E4D7" : "#086B85"}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="29"
          y="17"
          width="6"
          height="6"
          rx="1.5"
          transform="rotate(45 32 20)"
          fill={inverted ? "#fff" : "#102f40"}
        />
      </svg>
      <span className="font-semibold text-[27px] leading-none tracking-[-.055em]">
        Caliber
        <span className="ml-0.5 text-[#086b85] dark:text-[#B3E4D7]">.</span>
      </span>
    </Link>
  );
}
