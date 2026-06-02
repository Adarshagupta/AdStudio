import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import type { GenerationListItem } from "@/lib/generation-types";
import { VideoCard } from "@/components/library/VideoCard";

export function VideoGrid({ items }: { items: GenerationListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No videos yet"
        description="Create your first ad and it will appear in this library."
        action={
          <Button asChild>
            <Link href="/create/ugc-talking-head">Create first video</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {items.map((item, index) => (
        <VideoCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}
