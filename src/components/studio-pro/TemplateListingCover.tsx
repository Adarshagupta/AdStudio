import { Image as ImageIcon, Video } from "lucide-react";

import type { TemplateSampleOutput } from "@/lib/studio-pro/template-sample-types";
import { templateSampleCoverUrl } from "@/lib/studio-pro/template-sample-types";

export function TemplateListingCover({
  previewImageUrl,
  sampleOutputs,
  title,
}: {
  previewImageUrl: string | null;
  sampleOutputs: TemplateSampleOutput[];
  title: string;
}) {
  const coverUrl = previewImageUrl ?? templateSampleCoverUrl(sampleOutputs);
  const coverSample =
    sampleOutputs.find((sample) => sample.url === coverUrl) ??
    sampleOutputs.find((sample) => sample.type === "image") ??
    sampleOutputs[0];

  if (coverUrl && coverSample?.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt={title} className="mb-3 h-36 w-full rounded-xl object-cover" />
    );
  }

  if (coverUrl && coverSample?.type === "video") {
    return (
      <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-zinc-900">
        <video src={coverUrl} muted playsInline className="h-full w-full object-cover" />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[11px] text-white">
          <Video className="h-3 w-3" />
          Video sample
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3 flex h-36 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-zinc-50 text-sm text-zinc-400">
      <ImageIcon className="mr-2 h-4 w-4" />
      Flow preview
    </div>
  );
}
