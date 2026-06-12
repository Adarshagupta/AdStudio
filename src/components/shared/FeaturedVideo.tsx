"use client";

export function FeaturedVideo({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 ${className ?? ""}`}>
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className="block w-full object-cover"
        preload="metadata"
      />
    </div>
  );
}
