export default function ProcurementLoading() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-16" aria-busy="true">
      <p role="status" className="text-muted-foreground text-sm">
        Loading Procurement...
      </p>
      <div aria-hidden="true" className="mt-7 space-y-6">
        <div className="h-9 w-2/3 max-w-md rounded bg-muted" />
        <div className="h-4 w-full max-w-lg rounded bg-muted" />
        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2].map((item) => (
            <div className="h-44 rounded-xl border bg-muted/40" key={item} />
          ))}
        </div>
      </div>
    </main>
  );
}
