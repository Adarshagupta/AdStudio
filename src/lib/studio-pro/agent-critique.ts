import { topologicalSort } from "@/lib/studio-pro/graph";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const CTA_PATTERN = /\b(shop now|buy now|try now|learn more|sign up|get yours|order|link in bio|tap|swipe)\b/i;
const HOOK_PATTERN = /^.{0,120}[!?]/;

function nodeText(node: StudioNode) {
  return (
    node.data.scriptText?.trim() ||
    node.data.output?.trim() ||
    node.data.prompt?.trim() ||
    ""
  );
}

function platformFit(aspectRatio?: string) {
  const ratio = aspectRatio ?? "9:16";
  if (ratio === "9:16") return "Strong for TikTok, Reels, and Stories.";
  if (ratio === "1:1") return "Works for feed posts and carousel ads.";
  if (ratio === "16:9") return "Better for YouTube and landscape placements.";
  return `Uses ${ratio} — confirm it matches your placement.`;
}

export function reviewStudioFlow(nodes: StudioNode[], edges: StudioEdge[]) {
  if (nodes.length === 0) {
    return {
      ok: false,
      message: "Canvas is empty — add a brief and at least one output node before reviewing.",
      outputText: "",
    };
  }

  const sorted = topologicalSort(nodes, edges);
  const promptNodes = nodes.filter((node) => node.type === "prompt");
  const videoNodes = nodes.filter((node) => node.type === "video");
  const imageNodes = nodes.filter((node) => node.type === "image");
  const script = promptNodes.map(nodeText).filter(Boolean).join("\n\n");
  const hook = script.split(/\n+/).find((line) => line.trim())?.trim() ?? "";

  const findings: string[] = [];
  const strengths: string[] = [];

  if (hook.length >= 12) {
    strengths.push(`Opening line has a clear hook (${hook.length} chars).`);
    if (HOOK_PATTERN.test(hook)) strengths.push("Hook uses punchy punctuation.");
  } else {
    findings.push("Hook is thin — add a stronger first line or pattern interrupt.");
  }

  if (CTA_PATTERN.test(script)) {
    strengths.push("Call-to-action language is present.");
  } else {
    findings.push("No obvious CTA — add shop now, try now, or link in bio.");
  }

  if (videoNodes.length === 0 && imageNodes.length === 0) {
    findings.push("No image or video output node — pipeline is not publish-ready.");
  } else {
    strengths.push("Pipeline includes visual output.");
  }

  if (edges.length === 0 && nodes.length > 1) {
    findings.push("Nodes are not wired — connect brief → visual before running.");
  }

  const failed = nodes.filter((node) => node.data.status === "failed");
  if (failed.length > 0) {
    findings.push(`${failed.length} node(s) failed — fix or re-run before shipping.`);
  }

  const idleOutputs = [...imageNodes, ...videoNodes].filter(
    (node) => !node.data.imageUrl && !node.data.videoUrl && node.data.status !== "running",
  );
  if (idleOutputs.length > 0) {
    findings.push(`${idleOutputs.length} visual node(s) have no generated media yet.`);
  }

  const aspect = videoNodes[0]?.data.aspectRatio ?? imageNodes[0]?.data.aspectRatio;
  const platformNote = platformFit(aspect);

  const score =
    strengths.length + 2 >= findings.length + 2
      ? "Promising"
      : findings.length > strengths.length
        ? "Needs work"
        : "Almost ready";

  const outputText = [
    `Overall: ${score}`,
    "",
    strengths.length ? `Strengths:\n${strengths.map((line) => `• ${line}`).join("\n")}` : "",
    findings.length ? `Gaps:\n${findings.map((line) => `• ${line}`).join("\n")}` : "",
    "",
    `Platform: ${platformNote}`,
    `Chain: ${sorted.map((node) => node.id).join(" → ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    message: `Review complete — ${score.toLowerCase()}.`,
    outputText,
  };
}
