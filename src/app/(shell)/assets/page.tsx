import Link from "next/link";

import { UserAssetsGrid } from "@/components/assets/UserAssetsGrid";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { listUserMediaAssets } from "@/lib/user-media-assets";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: { kind?: string };
}) {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="Assets unavailable"
        message="You need content creation access to view your media library."
      />
    );
  }

  const kindParam = searchParams.kind;
  const filterKind =
    kindParam === "image" || kindParam === "audio" || kindParam === "video" ? kindParam : "all";

  const { items } = await listUserMediaAssets(currentUser.user.id, { limit: 120 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Your uploads and generated media — reuse them in Studio Pro without uploading again.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/studio-pro">Open Studio Pro</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink label="All" href="/assets" active={filterKind === "all"} />
        <FilterLink label="Images" href="/assets?kind=image" active={filterKind === "image"} />
        <FilterLink label="Audio" href="/assets?kind=audio" active={filterKind === "audio"} />
        <FilterLink label="Video" href="/assets?kind=video" active={filterKind === "video"} />
      </div>

      <UserAssetsGrid initialItems={items} filterKind={filterKind} />
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-800"
          : "rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-purple-200"
      }
    >
      {label}
    </Link>
  );
}
