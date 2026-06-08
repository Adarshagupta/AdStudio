"use server";

import { redirect } from "next/navigation";

import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { createStudioFlow } from "@/lib/studio-pro/flows";

export async function createStudioSessionAction() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    redirect("/dashboard");
  }

  const flow = await createStudioFlow(currentUser.workspace.id, currentUser.user.id);
  redirect(`/studio-pro/${flow.id}`);
}
