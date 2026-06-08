"use client";

import { useEffect, useState } from "react";

import { STUDIO_PRO_MIN_WIDTH_MEDIA } from "@/lib/layout/breakpoints";

export function useLargeScreen(mediaQuery = STUDIO_PRO_MIN_WIDTH_MEDIA) {
  const [isLargeScreen, setIsLargeScreen] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(mediaQuery);
    const update = () => setIsLargeScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [mediaQuery]);

  return isLargeScreen;
}
