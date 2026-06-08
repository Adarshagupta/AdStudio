"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { EditTemplateDialog } from "@/components/studio-pro/EditTemplateDialog";
import { StudioTemplateMarketplaceActions } from "@/components/studio-pro/StudioTemplateMarketplaceActions";
import { Button } from "@/components/ui/button";
import type { TemplateSampleOutput } from "@/lib/studio-pro/template-sample-types";

export function StudioTemplateDetailPanel({
  listingId,
  slug,
  title,
  description,
  priceCents,
  category,
  tags,
  sampleOutputs,
  owned,
  isOwner,
  sourceFlowId,
}: {
  listingId: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  category: string | null;
  tags: string[];
  sampleOutputs: TemplateSampleOutput[];
  owned: boolean;
  isOwner: boolean;
  sourceFlowId: string | null;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2">
        {isOwner ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit listing
          </Button>
        ) : null}

        <StudioTemplateMarketplaceActions
          listingId={listingId}
          slug={slug}
          priceCents={priceCents}
          owned={owned}
          showEditInStudio={owned}
        />
      </div>

      {isOwner ? (
        <EditTemplateDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          sourceFlowId={sourceFlowId}
          listing={{
            id: listingId,
            slug,
            title,
            description,
            priceCents,
            category,
            tags,
            sampleOutputs,
          }}
        />
      ) : null}
    </>
  );
}
