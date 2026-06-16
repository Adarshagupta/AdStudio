import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { LandingPage } from "@/components/landing/LandingPage";
import { getCurrentUser } from "@/lib/auth";
import { buildHomeJsonLd, buildHomeMetadata } from "@/lib/seo";

export const metadata: Metadata = buildHomeMetadata();

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <LandingPage />
    </>
  );
}
