export function RecentGridSkeleton() {
  return (
    <section className="animate-pulse space-y-5">
      <div className="flex gap-6">
        <div className="h-5 w-32 rounded-lg bg-zinc-100" />
        <div className="h-5 w-24 rounded-lg bg-zinc-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-video rounded-2xl bg-zinc-100" />
        ))}
      </div>
    </section>
  );
}
