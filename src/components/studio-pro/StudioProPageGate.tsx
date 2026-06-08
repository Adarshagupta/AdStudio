"use client";

import type { ReactNode } from "react";

import { StudioProLargeScreenGate } from "@/components/studio-pro/StudioProLargeScreenGate";

export function StudioProPageGate({ children }: { children: ReactNode }) {
  return <StudioProLargeScreenGate>{children}</StudioProLargeScreenGate>;
}
