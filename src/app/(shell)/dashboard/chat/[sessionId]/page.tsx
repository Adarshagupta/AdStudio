import { Suspense } from "react";

import { DashboardChat } from "@/components/dashboard/DashboardChat";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";

function ChatFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
      Loading chat…
    </div>
  );
}

export default async function DashboardChatSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const currentUser = await requireCurrentUser();

  return (
    <Suspense fallback={<ChatFallback />}>
      <DashboardChat
        sessionId={params.sessionId}
        canCreate={currentUserCan(currentUser, "createContent")}
      />
    </Suspense>
  );
}
