import { notFound } from "next/navigation";

import { FeaturePage } from "@/components/feature/FeaturePage";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { getFormatBySlug } from "@/lib/formats";

export default async function FeatureFormatPage({
  params,
}: {
  params: { format: string };
}) {
  const currentUser = await requireCurrentUser();
  const selectedFormat = getFormatBySlug(params.format);

  if (!selectedFormat) {
    notFound();
  }

  return (
    <FeaturePage
      format={selectedFormat}
      canCreate={currentUserCan(currentUser, "createContent")}
    />
  );
}
