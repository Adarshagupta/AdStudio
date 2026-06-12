import Link from "next/link";
import { motion } from "framer-motion";

import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import type { FormatConfig } from "@/lib/formats";

type Format = FormatConfig;

export function FormatCard({ format }: { format: Format }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Link href={`/create/${format.slug}`} className="group block min-w-[190px] flex-1">
        <div className="flex items-center gap-2.5 rounded-2xl bg-zinc-100/70 p-2 transition-all duration-200 hover:bg-zinc-100">
          <div className="shrink-0 overflow-hidden rounded-lg">
            <VideoThumbnail type={format.format} compact className="rounded-lg" />
          </div>
          <div className="min-w-0 space-y-0.5 pr-1">
            <h3 className="text-sm font-medium leading-tight text-zinc-900">{format.name}</h3>
            <p className="line-clamp-2 text-[11px] leading-4 text-zinc-500">{format.description}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
