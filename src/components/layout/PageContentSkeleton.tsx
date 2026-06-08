export function PageContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 py-2 md:px-8">
      <div className="h-9 w-56 rounded-xl bg-zinc-100" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-32 rounded-2xl bg-zinc-100" />
      ))}
    </div>
  );
}
