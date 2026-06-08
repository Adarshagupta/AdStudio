"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error.message?.includes("Database") ||
    error.message?.includes("schema") ||
    error.message?.includes("Neon") ||
    error.message?.includes("quota")
      ? error.message
      : "Something went wrong loading this page. If you just deployed, wait for the build to finish and try again. Persistent errors usually mean the database needs migrations (`prisma migrate deploy` on Neon).";

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fcfcfc] p-8 font-sans text-zinc-900">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
          <h1 className="font-display text-2xl font-semibold">Application error</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">{message}</p>
          {error.digest ? (
            <p className="mt-2 text-xs text-zinc-400">Reference: {error.digest}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
            <a
              href="/login"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Back to login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
