import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
