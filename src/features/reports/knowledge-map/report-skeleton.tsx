export function ReportSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-6" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />
    </div>
  );
}
