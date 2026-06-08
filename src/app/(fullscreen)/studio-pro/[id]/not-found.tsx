import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function StudioFlowNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="max-w-md rounded-3xl bg-zinc-100/70 px-8 py-14 text-center">
        <p className="font-display text-2xl font-semibold text-zinc-900">Session not found</p>
        <p className="mt-2 text-sm text-zinc-500">
          This Studio Pro session does not exist or you do not have access to it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/studio-pro">Back to sessions</Link>
        </Button>
      </div>
    </div>
  );
}
