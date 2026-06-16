"use client";

import Link from "next/link";

import { FEATURED_INSPIRATION_VIDEOS } from "@/lib/inspiration-videos";
import {
  MARKETING_IMAGE_GENERATION,
  MARKETING_PRODUCT_AD,
} from "@/lib/marketing-assets";
import { cn } from "@/lib/utils";

const MODEL_PROMOS = [
  {
    id: "ltx-2-3",
    label: "Try LTX 2.3",
    tag: "New",
    description: "Fast synced-audio video",
    href: "/dashboard/chat?tool=video&prompt=Create+a+cinematic+video+with+LTX+2.3",
    previewVideo: FEATURED_INSPIRATION_VIDEOS[2],
  },
  {
    id: "wan-2-7",
    label: "Wan 2.7",
    tag: "Hot",
    description: "Smooth image-to-video",
    href: "/dashboard/chat?tool=video&prompt=Create+a+motion+video+with+Wan+2.7",
    previewImage: MARKETING_IMAGE_GENERATION,
  },
] as const;

function PromoThumb({
  previewVideo,
  previewImage,
}: {
  previewVideo?: string;
  previewImage?: string;
}) {
  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-zinc-100">
      {previewVideo ? (
        <video
          src={previewVideo}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
      ) : previewImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewImage} alt="" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

export function SidebarModelPromoBanner({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (collapsed) {
    return (
      <Link
        href={MODEL_PROMOS[0].href}
        onClick={onNavigate}
        title="Try LTX 2.3"
        aria-label="Try LTX 2.3"
        className="mx-auto block h-8 w-8 overflow-hidden rounded-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MARKETING_PRODUCT_AD}
          alt=""
          className="h-full w-full object-cover"
        />
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-0.5",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {MODEL_PROMOS.map((promo) => (
        <Link
          key={promo.id}
          href={promo.href}
          onClick={onNavigate}
          className="group flex min-w-0 shrink-0 snap-start items-center gap-2 transition hover:opacity-80"
        >
          <PromoThumb
            previewVideo={"previewVideo" in promo ? promo.previewVideo : undefined}
            previewImage={"previewImage" in promo ? promo.previewImage : undefined}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-[11px] font-medium text-zinc-800 group-hover:text-zinc-950">
                {promo.label}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[8px] font-semibold uppercase tracking-wide",
                  promo.tag === "Hot" ? "text-orange-600" : "text-violet-600",
                )}
              >
                {promo.tag}
              </span>
            </div>
            <p className="truncate text-[10px] text-zinc-500">{promo.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
