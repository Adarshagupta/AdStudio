import { Badge } from "@/components/ui/badge";
import type { GenerationFormat } from "@prisma/client";
import { cn } from "@/lib/utils";

const labels: Record<GenerationFormat, string> = {
  UGC: "UGC",
  BRAIN_ROT: "Brain rot",
  STATIC: "Static",
  REVIEW: "Review",
};

export function TypeBadge({ type }: { type: GenerationFormat }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        type === "UGC" && "bg-purple-50 text-purple-950",
        type === "BRAIN_ROT" && "bg-amber-50 text-amber-950",
        type === "STATIC" && "bg-sky-50 text-sky-950",
        type === "REVIEW" && "bg-emerald-50 text-emerald-950",
      )}
    >
      {labels[type]}
    </Badge>
  );
}
