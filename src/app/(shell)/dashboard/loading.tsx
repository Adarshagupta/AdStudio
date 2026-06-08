export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-12">
      <div className="h-36 rounded-3xl bg-zinc-100" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 w-40 shrink-0 rounded-2xl bg-zinc-100" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-video rounded-2xl bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}
