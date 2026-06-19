import { Clock3, Database, Film, Users } from "lucide-react";

import { GenerationsBarChartLazy } from "@/components/analytics/GenerationsBarChartLazy";
import type { ChartPoint } from "@/components/analytics/GenerationsBarChart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TypeBadge } from "@/components/shared/TypeBadge";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Card } from "@/components/ui/card";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/generation-types";

const metricIcons = [Film, Clock3, Database, Users];

export default async function AnalyticsPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "viewAnalytics")) {
    return (
      <AccessDenied
          title="Analytics access unavailable"
          message="Ask a workspace admin to enable analytics for your account."
        />
      );
  }

  const [totalVideos, completedGenerations, teamMembers, recentGenerations] = await Promise.all([
    prisma.generation.count({ where: { workspaceId: currentUser.workspace.id } }),
    prisma.generation.findMany({
      where: {
        workspaceId: currentUser.workspace.id,
        status: "COMPLETED",
        renderTimeMs: { not: null },
      },
      select: { renderTimeMs: true },
    }),
    prisma.workspaceMember.count({
      where: { workspaceId: currentUser.workspace.id, isActive: true },
    }),
    prisma.generation.findMany({
      where: { workspaceId: currentUser.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const avgRenderMs =
    completedGenerations.length > 0
      ? completedGenerations.reduce((sum, generation) => sum + (generation.renderTimeMs ?? 0), 0) /
        completedGenerations.length
      : 0;

  const metrics = [
    { label: "Videos Generated", value: String(totalVideos), detail: "From this workspace" },
    { label: "Avg Render Time", value: formatDuration(avgRenderMs), detail: "Completed jobs only" },
    { label: "Storage Used", value: "0 GB", detail: "Connect R2 metadata to track size" },
    { label: "Team Members", value: String(teamMembers), detail: "Active workspace users" },
  ];
  const chartData = await getChartData(currentUser.workspace.id);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Workspace usage, generation speed, storage, and recent job health.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metricIcons[index];

            return (
              <Card key={metric.label} className="space-y-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-zinc-50 text-zinc-600">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-medium tracking-normal">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.detail}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="space-y-4 bg-card">
          <div>
            <h2 className="text-sm font-medium">Generations per day</h2>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <GenerationsBarChartLazy data={chartData} />
        </Card>

        <Card className="overflow-hidden bg-card p-0">
          <div className="border-b p-4">
            <h2 className="text-sm font-medium">Recent generations</h2>
            <p className="text-xs text-muted-foreground">Latest jobs across the workspace</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentGenerations.map((generation) => (
                  <tr key={generation.id} className="border-b transition-colors last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{generation.prompt}</td>
                    <td className="px-4 py-3">
                      <TypeBadge type={generation.format} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={generation.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelativeTime(generation.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
}

async function getChartData(workspaceId: string): Promise<ChartPoint[]> {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const generations = await prisma.generation.findMany({
    where: {
      workspaceId,
      createdAt: { gte: start },
    },
    select: { createdAt: true },
  });
  const counts = new Map<string, number>();

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    counts.set(formatDayKey(date), 0);
  }

  for (const generation of generations) {
    const key = formatDayKey(generation.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([day, generationCount]) => ({
    day,
    generations: generationCount,
  }));
}

function formatDayKey(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDuration(ms: number) {
  if (!ms) return "N/A";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
