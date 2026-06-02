import Link from "next/link";
import { Copy, Download, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TypeBadge } from "@/components/shared/TypeBadge";
import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import type { GenerationListItem } from "@/lib/generation-types";

export function VideoCard({ item, index }: { item: GenerationListItem; index: number }) {
  return (
    <Link href={`/generations/${item.id}`} className="block">
      <Card className="group overflow-hidden p-3 transition-all duration-200 hover:bg-zinc-50/40">
        <div className="relative overflow-hidden rounded-lg">
          <VideoThumbnail type={item.type} index={index} />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-zinc-950/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="icon" variant="secondary" aria-label="Play video">
              <Play className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" aria-label="Download video">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" aria-label="Duplicate video">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>
          <div>
            <h3 className="text-sm font-medium">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.timestamp}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
