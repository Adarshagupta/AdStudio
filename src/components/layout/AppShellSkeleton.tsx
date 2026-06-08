export function AppShellSkeleton({ fullscreen = false }: { fullscreen?: boolean }) {
  if (fullscreen) {
    return (
      <div className="relative h-screen w-screen animate-pulse bg-[#fcfcfc]">
        <div className="absolute inset-0 bg-zinc-50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-pulse bg-[#fcfcfc]">
      <div className="fixed left-3 top-3 bottom-3 hidden w-[228px] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-lg md:flex">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2">
          <div className="h-7 w-24 rounded-lg bg-zinc-100" />
          <div className="h-8 w-8 rounded-lg bg-zinc-100" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-9 rounded-lg bg-zinc-100" />
          ))}
        </div>
        <div className="mt-auto space-y-2 border-t border-zinc-100 p-3">
          <div className="h-16 rounded-xl bg-zinc-50" />
          <div className="h-9 rounded-lg bg-zinc-100" />
        </div>
      </div>
      <div className="min-h-screen md:pl-[calc(228px+1.5rem)]">
        <div className="h-16 border-b border-zinc-100 bg-white/80" />
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
          <div className="h-10 w-48 rounded-xl bg-zinc-100" />
          <div className="h-40 rounded-2xl bg-zinc-100" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-video rounded-2xl bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
