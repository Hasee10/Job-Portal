import Link from "next/link";
import Image from "next/image";
export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Quantus home"
      className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      {inverted ? (
        <Image
          src="/quantus-wordmark-light.svg"
          width={203}
          height={52}
          alt="Quantus"
          className="h-10 w-auto"
        />
      ) : (
        <>
          <Image
            src="/quantus-wordmark.svg"
            width={203}
            height={52}
            alt="Quantus"
            className="h-10 w-auto dark:hidden"
          />
          <Image
            src="/quantus-wordmark-light.svg"
            width={203}
            height={52}
            alt="Quantus"
            className="hidden h-10 w-auto dark:block"
          />
        </>
      )}
    </Link>
  );
}
