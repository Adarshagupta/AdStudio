"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {
        // Non-fatal — app still works without install/offline support.
      });
  }, []);

  return null;
}
