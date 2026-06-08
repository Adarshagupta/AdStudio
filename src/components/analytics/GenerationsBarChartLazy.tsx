"use client";

import dynamic from "next/dynamic";

import type { ChartPoint } from "@/components/analytics/GenerationsBarChart";

const GenerationsBarChart = dynamic(
  () =>
    import("@/components/analytics/GenerationsBarChart").then((mod) => mod.GenerationsBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[320px] w-full animate-pulse rounded-2xl bg-zinc-100" />,
  },
);

export function GenerationsBarChartLazy({ data }: { data: ChartPoint[] }) {
  return <GenerationsBarChart data={data} />;
}
