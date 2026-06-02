import Link from "next/link";
import { Plus, Workflow } from "lucide-react";
import { redirect } from "next/navigation";

import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { createStudioFlow, listStudioFlows } from "@/lib/studio-pro/flows";

export default async function StudioProIndexPage({
  searchParams,
}: {
  searchParams?: { new?: string };
}) {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <ProtectedShell currentUser={currentUser}>
        <AccessDenied
          title="Studio Pro access unavailable"
          message="Ask a workspace admin to enable content creation for your account."
        />
      </ProtectedShell>
    );
  }

  if (searchParams?.new === "1") {
    const flow = await createStudioFlow(currentUser.workspace.id, currentUser.user.id);
    redirect(`/studio-pro/${flow.id}`);
  }

  const flows = await listStudioFlows(currentUser.workspace.id);

  return (
    <ProtectedShell currentUser={currentUser}>
      <div className="space-y-10 py-4 md:py-8">
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700">
              Visual flow builder
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-[2.75rem] md:leading-tight">
                Studio Pro sessions
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Build node-based ad flows, auto-save your work, and return anytime with the same session link.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/studio-pro?new=1">
              <Plus className="h-4 w-4" />
              New session
            </Link>
          </Button>
        </section>

        {flows.length === 0 ? (
          <section className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <Workflow className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold text-zinc-900">No sessions yet</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Create your first flow canvas. Every session gets its own saved link.
            </p>
            <Button asChild className="mt-6">
              <Link href="/studio-pro?new=1">Create session</Link>
            </Button>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center gap-6">
              <p className="text-sm font-medium text-zinc-900">Recent sessions</p>
              <p className="text-sm text-zinc-400">{flows.length} saved</p>
            </div>
            <div className="grid gap-3">
              {flows.map((flow) => (
                <Link
                  key={flow.id}
                  href={`/studio-pro/${flow.id}`}
                  className="group flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition hover:shadow-[0_12px_40px_rgba(124,58,237,0.08)]"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{flow.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Updated {flow.updatedAt.toLocaleString()} · {flow.id.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-sm text-purple-600 opacity-0 transition group-hover:opacity-100">
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </ProtectedShell>
  );
}
