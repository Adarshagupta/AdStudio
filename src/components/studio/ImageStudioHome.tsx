"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderUp, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  INSPIRATION_FILTERS,
  INSPIRATION_ITEMS,
  MARKETING_FEATURES,
  QUICK_TOOLS,
  type InspirationFilter,
  type MarketingFeature,
  type QuickTool,
} from "@/lib/image-studio-home-content";
import { setStudioImageUrl } from "@/lib/studio-image-transfer";
import { cn } from "@/lib/utils";

const badgeToneStyles = {
  orange: "bg-orange-100 text-orange-700",
  pink: "bg-pink-100 text-pink-700",
  violet: "bg-violet-100 text-violet-700",
};

function buildEditHref(params: { w?: number; h?: number }) {
  const search = new URLSearchParams();
  if (params.w) search.set("w", String(params.w));
  if (params.h) search.set("h", String(params.h));
  const query = search.toString();
  return query ? `/studio/image/edit?${query}` : "/studio/image/edit";
}

function MarketingFeatureCard({ item }: { item: MarketingFeature }) {
  return (
    <Link
      href={item.href}
      className="group relative flex min-h-[188px] flex-col overflow-hidden rounded-2xl bg-zinc-100/90 p-5 transition hover:bg-zinc-100"
    >
      <div className="relative z-10 space-y-2.5">
        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-violet-700">
          {item.title}
        </h3>
        {item.badge ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              badgeToneStyles[item.badge.tone],
            )}
          >
            {item.badge.label}
          </span>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[118px] w-[118px] overflow-hidden rounded-2xl border-4 border-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] transition duration-500 group-hover:scale-[1.03]"
        style={{ transform: `rotate(${item.previewRotate ?? 6}deg) translate(12px, 12px)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewImage} alt="" className="h-full w-full object-cover" />
      </div>
    </Link>
  );
}

function QuickToolCard({ item }: { item: QuickTool }) {
  return (
    <Link
      href={item.href}
      className="group flex min-w-[180px] flex-1 items-center gap-3 rounded-2xl bg-zinc-100/90 px-4 py-3 transition hover:bg-zinc-100"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewImage} alt="" className="h-full w-full object-cover" />
      </div>
      <span className="text-sm font-medium text-zinc-800 group-hover:text-violet-700">
        {item.label}
      </span>
    </Link>
  );
}

export function ImageStudioHome() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<InspirationFilter>("text-poster");

  function openEditor(params?: { w?: number; h?: number; image?: string }) {
    if (params?.image) {
      setStudioImageUrl(params.image);
    }
    router.push(buildEditHref({ w: params?.w, h: params?.h }));
  }

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string | undefined;
      if (dataUrl) openEditor({ image: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  const filteredInspiration = useMemo(() => {
    if (filter === "all") return INSPIRATION_ITEMS;
    return INSPIRATION_ITEMS.filter((item) => item.category === filter);
  }, [filter]);

  return (
    <div className="relative space-y-10 pb-16 pt-2 md:space-y-12">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleUpload(file);
          event.target.value = "";
        }}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Level up marketing images</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MARKETING_FEATURES.map((item) => (
            <MarketingFeatureCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Quick tools</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          {QUICK_TOOLS.map((item) => (
            <QuickToolCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Find inspiration</h2>

        <div className="flex flex-wrap gap-2">
          {INSPIRATION_FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-violet-100 text-violet-700"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-100/90 p-4 text-center transition hover:bg-zinc-100"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 transition group-hover:scale-105">
              <FolderUp className="h-6 w-6" />
            </div>
            <span className="max-w-[140px] text-sm font-medium leading-6 text-zinc-700">
              Create from your {filter === "text-poster" ? "text poster" : "image"}
            </span>
          </button>

          {filteredInspiration.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openEditor({ image: item.imageUrl })}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200/60 transition hover:ring-violet-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.alt}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-20 md:bottom-8 md:right-8">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-violet-600 shadow-lg hover:bg-violet-700"
          aria-label="Help"
          asChild
        >
          <Link href="/contact">
            <HelpCircle className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
