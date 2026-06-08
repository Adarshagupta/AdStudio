import { MULTI_CLIP_WORKFLOW_STEPS, MULTI_CLIP_WORKFLOW_SUMMARY } from "@/lib/studio-pro/multi-clip-workflow";

export function StudioMultiClipWorkflow({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">{MULTI_CLIP_WORKFLOW_SUMMARY}</p>
    );
  }

  return (
    <div className="text-left">
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Multi-clip workflow</p>
      <ol className="mt-2 space-y-1.5 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
        {MULTI_CLIP_WORKFLOW_STEPS.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="shrink-0 font-medium text-zinc-400 dark:text-zinc-500">{index + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
