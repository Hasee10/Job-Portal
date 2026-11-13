"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProcurementError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-20">
      <p className="font-medium text-primary text-sm">Procurement</p>
      <h1 className="mt-3 font-semibold text-3xl tracking-tight">
        This workspace could not load.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Please try again. If this continues, you can return to the overview and
        choose another section.
      </p>
      <div className="mt-7 flex flex-wrap gap-4">
        <Button type="button" onClick={retry}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/procurement">Procurement overview</Link>
        </Button>
      </div>
    </main>
  );
}
