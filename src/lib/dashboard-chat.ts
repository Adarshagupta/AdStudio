import type { DashboardOutputType } from "@/lib/dashboard-generation";

export type ChatToolMode = "image" | "video" | "edit-video" | "extend-video";

export type ChatAttachment = {
  id: string;
  kind: "image" | "video";
  url: string;
  previewUrl?: string;
  name?: string;
};

export type AgentStepStatus = "pending" | "running" | "completed" | "failed";

export type AgentStep = {
  id: string;
  label: string;
  description?: string;
  status: AgentStepStatus;
  output?: string;
  assetUrl?: string;
  assetKind?: "image" | "audio" | "video" | "script";
  error?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  createdAt: number;
  text?: string;
  attachments?: ChatAttachment[];
  productUrl?: string;
  toolMode?: ChatToolMode;
  status?: "pending" | "processing" | "completed" | "failed";
  generationId?: string;
  outputType?: DashboardOutputType;
  imageUrl?: string;
  videoUrl?: string;
  scriptText?: string;
  error?: string;
  agentMode?: boolean;
  thinking?: string;
  thinkingSteps?: string[];
  agentSteps?: AgentStep[];
  settings?: {
    aspectRatio?: string;
    duration?: number;
    tone?: string;
    imageModel?: string;
    videoModel?: string;
  };
};

export const CHAT_TOOL_OPTIONS: {
  id: ChatToolMode;
  label: string;
  description: string;
}[] = [
  { id: "image", label: "Image", description: "Generate a still ad or product shot" },
  { id: "video", label: "Video", description: "Text or image to short-form video" },
  { id: "edit-video", label: "Edit video", description: "Restyle or transform an uploaded clip" },
  { id: "extend-video", label: "Extend video", description: "Continue from your clip's last frame" },
];

export const DASHBOARD_CHAT_LAUNCH_KEY = "dashboard-chat-launch-v1";

export type DashboardChatLaunch = {
  prompt: string;
  toolMode: ChatToolMode;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  productUrl?: string;
  aspectRatio?: string;
};

export function saveDashboardChatLaunch(launch: DashboardChatLaunch) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DASHBOARD_CHAT_LAUNCH_KEY, JSON.stringify(launch));
  } catch {
    // Private browsing or blocked storage — URL params still carry the prompt.
  }
}

export function readDashboardChatLaunch(): DashboardChatLaunch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CHAT_LAUNCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardChatLaunch;
  } catch {
    return null;
  }
}

export function clearDashboardChatLaunch() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DASHBOARD_CHAT_LAUNCH_KEY);
  } catch {
    // ignore
  }
}

/** @deprecated Use read + clear separately so React Strict Mode does not drop the payload. */
export function consumeDashboardChatLaunch(): DashboardChatLaunch | null {
  const launch = readDashboardChatLaunch();
  if (launch) clearDashboardChatLaunch();
  return launch;
}

export function buildDashboardChatPath(launch: DashboardChatLaunch, sessionId?: string) {
  const params = new URLSearchParams({
    prompt: launch.prompt,
    tool: launch.toolMode,
  });
  if (launch.aspectRatio) params.set("aspect", launch.aspectRatio);
  if (launch.productUrl) params.set("productUrl", launch.productUrl);

  const id = sessionId ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : "new");
  return `/dashboard/chat/${id}?${params.toString()}`;
}

export function getPostAuthRedirectPath(options?: { onboardingCompleted?: boolean }) {
  const launch = readDashboardChatLaunch();
  if (launch) return buildDashboardChatPath(launch);
  if (options?.onboardingCompleted === false) return "/onboarding";
  return "/dashboard";
}

export function launchFromSearchParams(params: URLSearchParams): DashboardChatLaunch | null {
  const prompt = params.get("prompt")?.trim();
  if (!prompt) return null;

  const tool = params.get("tool");
  const toolMode: ChatToolMode =
    tool === "image" || tool === "video" || tool === "edit-video" || tool === "extend-video"
      ? tool
      : "video";

  return {
    prompt,
    toolMode,
    aspectRatio: params.get("aspect") ?? undefined,
    productUrl: params.get("productUrl") ?? undefined,
  };
}

export const CHAT_STARTER_PROMPTS = [
  "Agent: Create a full skincare ad with script, image, voiceover, and video",
  "Research my product URL and create a UGC ad for it",
  "Product hero image on a clean pastel background",
  "Turn my reference photo into a 10s vertical ad",
] as const;

export function validateChatPrompt(
  text: string,
  attachments: ChatAttachment[],
  toolMode: ChatToolMode,
  productUrl?: string,
) {
  const trimmed = text.trim();
  const normalizedProductUrl = productUrl?.trim() ?? "";
  const hasImage = attachments.some((item) => item.kind === "image");
  const hasVideo = attachments.some((item) => item.kind === "video");

  if (normalizedProductUrl) {
    try {
      new URL(normalizedProductUrl);
    } catch {
      return { ok: false as const, message: "Enter a valid product URL (https://…)." };
    }
  }

  if (toolMode === "edit-video" || toolMode === "extend-video") {
    if (!hasVideo) {
      return { ok: false as const, message: "Attach a video to edit or extend." };
    }
    if (trimmed.length < 3) {
      return {
        ok: true as const,
        prompt:
          toolMode === "extend-video"
            ? "Continue the scene naturally from the last frame."
            : "Apply a polished ad-style edit to this clip.",
      };
    }
    return { ok: true as const, prompt: trimmed };
  }

  if (trimmed.length >= 3) {
    return { ok: true as const, prompt: trimmed };
  }

  if (normalizedProductUrl) {
    return {
      ok: true as const,
      prompt: "Create a UGC ad using the product and brand details from the website.",
    };
  }

  if (hasImage || hasVideo) {
    return {
      ok: true as const,
      prompt: hasVideo
        ? "Transform this clip into a short-form ad."
        : "Create a short vertical ad from this reference image.",
    };
  }

  return {
    ok: false as const,
    message: "Describe what you want, or attach an image or video.",
  };
}

export function inferToolMode(
  selected: ChatToolMode,
  attachments: ChatAttachment[],
): ChatToolMode {
  const hasVideo = attachments.some((item) => item.kind === "video");
  const hasImage = attachments.some((item) => item.kind === "image");

  if (selected === "edit-video" || selected === "extend-video") {
    return selected;
  }

  if (hasVideo && selected === "video") {
    return "edit-video";
  }

  if (hasImage && !hasVideo && selected === "video") {
    return "video";
  }

  return selected;
}

export function toolModeLabel(mode: ChatToolMode) {
  return CHAT_TOOL_OPTIONS.find((item) => item.id === mode)?.label ?? mode;
}
