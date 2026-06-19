import type { Metadata } from "next";

import { InspirationFeed } from "@/components/dashboard/InspirationFeed";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function InspirationFeedPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <InspirationFeed />
    </div>
  );
}
