import { Badge } from "@/components/ui/badge";
import type { GenerationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const labels: Record<GenerationStatus, string> = {
  QUEUED: "Queued",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function StatusBadge({ status }: { status: GenerationStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-white",
        status === "PROCESSING" && "bg-amber-50 text-amber-700",
        status === "COMPLETED" && "bg-green-50 text-green-700",
        status === "FAILED" && "bg-red-50 text-red-600",
      )}
    >
      {labels[status]}
    </Badge>
  );
}
