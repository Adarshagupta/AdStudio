"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, ShoppingCart, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

export function StudioTemplateMarketplaceActions({
  listingId,
  slug,
  priceCents,
  owned,
  showEditInStudio = false,
  compact = false,
}: {
  listingId: string;
  slug: string;
  priceCents: number;
  owned: boolean;
  showEditInStudio?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"use" | "checkout" | null>(null);

  const handleUseTemplate = async () => {
    setLoading("use");
    try {
      const response = await fetch(`/api/studio/templates/${listingId}/use`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to open template.");
      }

      router.push(`/studio-pro/${data.flowId}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to open template.");
      setLoading(null);
    }
  };

  const checkout = async () => {
    setLoading("checkout");
    try {
      const response = await fetch(`/api/studio/templates/${listingId}/checkout`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to start checkout.");
      setLoading(null);
    }
  };

  if (owned || priceCents <= 0) {
    const label = showEditInStudio
      ? "Edit in Studio"
      : priceCents <= 0
        ? "Use free template"
        : "Use in Studio";

    return (
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        className="gap-2"
        disabled={loading === "use"}
        onClick={() => void handleUseTemplate()}
      >
        {loading === "use" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : showEditInStudio ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {label}
      </Button>
    );
  }

  return (
    <div className={compact ? "flex gap-2" : "flex flex-wrap gap-3"}>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => router.push(`/studio-pro/marketplace/${slug}`)}
      >
        Preview
      </Button>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        className="gap-2"
        disabled={loading === "checkout"}
        onClick={() => void checkout()}
      >
        {loading === "checkout" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
        Buy & use
      </Button>
    </div>
  );
}
