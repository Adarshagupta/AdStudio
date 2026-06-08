import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { compactStudioScript, formatStudioNodeText } from "@/lib/studio-pro/display-text";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import {
  buildAudioDirection,
  buildImageGenerationContext,
  buildVideoGenerationContext,
  composePrompt,
  getUpstreamNodes,
  resolveAudioSpeech,
  resolveNodePrompt,
} from "@/lib/studio-pro/graph";
import { pollGenerationUntilComplete, startGeneration } from "@/lib/generation-client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateVoiceoverScript(brief: string) {
  const response = await fetch("/api/scripts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: "UGC",
      prompt: `Write a short voiceover script for text-to-speech. Use 2-4 natural spoken sentences. No stage directions or labels.\n\n${brief}`,
    }),
  });

  const data = await readJsonResponse<{ scriptText?: string; error?: string }>(response);
  if (!response.ok || !data.scriptText) {
    throw new Error(responseErrorMessage(response, data, "Voiceover script generation failed."));
  }

  return data.scriptText.trim();
}

export async function runPromptNode(node: StudioNode, upstream: StudioNode[]) {
  const prompt = resolveNodePrompt(node, upstream);
  if (!prompt || prompt.length < 10) {
    throw new Error("Text node needs at least 10 characters.");
  }

  const response = await fetch("/api/scripts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: "UGC",
      prompt,
      model: node.data.model,
      purpose: "studio",
    }),
  });

  const data = await readJsonResponse<{ scriptText?: string; error?: string }>(response);
  if (!response.ok || !data.scriptText) {
    throw new Error(responseErrorMessage(response, data, "Script generation failed."));
  }

  await sleep(500);
  const scriptText =
    compactStudioScript(formatStudioNodeText(data.scriptText) || data.scriptText) ||
    data.scriptText;
  return { output: scriptText, scriptText, prompt: node.data.prompt ?? prompt };
}

export async function runCharacterNode(node: StudioNode, upstream: StudioNode[]) {
  const context = composePrompt(upstream);
  const name = node.data.characterName?.trim();
  const brief = node.data.prompt?.trim();

  if (!name && !brief && !context) {
    throw new Error("Add a character name, brief, or connect an upstream Text node.");
  }

  const response = await fetch("/api/studio/character", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      characterName: name,
      prompt: brief,
      context: context || undefined,
      model: node.data.model,
    }),
  });

  const data = await readJsonResponse<{ output?: string; scriptText?: string; error?: string }>(response);
  if (!response.ok || !data.output) {
    throw new Error(responseErrorMessage(response, data, "Character generation failed."));
  }

  const output = formatStudioNodeText(data.output) || data.output;
  return {
    output,
    scriptText: formatStudioNodeText(data.scriptText) || output,
    prompt: node.data.prompt,
    characterName: node.data.characterName,
  };
}

function wantsFreshGeneration(node: StudioNode, upstream: StudioNode[]) {
  const localPrompt = (node.data.prompt || "").trim();
  if (localPrompt.length >= 10) return true;
  const upstreamPrompt = composePrompt(upstream);
  return upstreamPrompt.trim().length >= 10;
}

function wantsFreshImageGeneration(
  node: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  if ((node.data.prompt || "").trim().length >= 10) return true;
  const plan = buildImageGenerationContext(node, nodes, edges);
  return plan.scenePrompt.trim().length >= 10;
}

export async function runAudioNode(node: StudioNode, upstream: StudioNode[]) {
  if (
    node.data.mediaSource === "upload" &&
    node.data.audioUrl &&
    !wantsFreshGeneration(node, upstream)
  ) {
    const label = node.data.audioTitle?.trim() || "Uploaded audio";
    return {
      output: node.data.audioUrl,
      audioUrl: node.data.audioUrl,
      prompt: node.data.prompt ?? label,
      scriptText: node.data.prompt?.trim() || label,
      audioTitle: node.data.audioTitle,
      voiceStyle: node.data.voiceStyle,
    };
  }

  let speech = resolveAudioSpeech(node, upstream);

  if (!speech || speech.length < 3) {
    const direction = buildAudioDirection(node, upstream);
    if (direction.length >= 3) {
      speech = await generateVoiceoverScript(direction);
    }
  }

  if (!speech || speech.length < 3) {
    throw new Error(
      "Add a speech script, fill in voice style or track title, or connect a Text node with content.",
    );
  }

  const response = await fetch("/api/studio/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: speech,
      model: node.data.model,
    }),
  });

  const data = await readJsonResponse<{ audioUrl?: string; error?: string }>(response);
  if (!response.ok || !data.audioUrl) {
    throw new Error(responseErrorMessage(response, data, "Audio generation failed."));
  }

  return {
    output: data.audioUrl,
    audioUrl: data.audioUrl,
    prompt: speech,
    scriptText: speech,
    audioTitle: node.data.audioTitle,
    voiceStyle: node.data.voiceStyle,
    mediaSource: "generated" as const,
  };
}

export async function runImageNode(
  node: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  if (
    node.data.mediaSource === "upload" &&
    node.data.imageUrl &&
    !wantsFreshImageGeneration(node, nodes, edges)
  ) {
    return {
      output: node.data.imageUrl,
      imageUrl: node.data.imageUrl,
      prompt: node.data.prompt ?? "Uploaded reference image",
    };
  }

  const plan = buildImageGenerationContext(node, nodes, edges);
  if (!plan.scenePrompt || plan.scenePrompt.length < 10) {
    throw new Error(
      "Connect upstream Text or Character nodes (with name/description), add shot notes, or upload an image.",
    );
  }

  const response = await fetch("/api/studio/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: plan.scenePrompt,
      model: node.data.model,
      aspectRatio: node.data.aspectRatio,
    }),
  });

  const data = await readJsonResponse<{ imageUrl?: string; error?: string }>(response);
  if (!response.ok || !data.imageUrl) {
    throw new Error(responseErrorMessage(response, data, "Image generation failed."));
  }

  return {
    output: data.imageUrl,
    imageUrl: data.imageUrl,
    prompt: plan.shotNotes || plan.scenePrompt.slice(0, 240),
    mediaSource: "generated" as const,
  };
}

export async function runVideoNode(
  node: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  const plan = buildVideoGenerationContext(node, nodes, edges);
  const hasReferenceMedia = Boolean(
    plan.media.imageUrls.length > 0 || plan.media.videoUrl,
  );

  if (!hasReferenceMedia && (!plan.scriptText || plan.scriptText.length < 10)) {
    throw new Error(
      "Connect upstream nodes with a script (Text, Character, or Audio), or connect an Image / Video node as reference.",
    );
  }

  const scriptText =
    plan.scriptText.length >= 10
      ? plan.scriptText
      : [
          plan.shotNotes,
          plan.visualDirection,
          hasReferenceMedia ? "Natural UGC delivery with synced audio." : "",
        ]
          .filter(Boolean)
          .join("\n")
          .trim() || "Deliver the scene with clear synced audio.";

  const visualPrompt = [plan.visualDirection, plan.continuityNotes].filter(Boolean).join("\n\n");

  const started = await startGeneration({
    format: "UGC",
    prompt: visualPrompt,
    scriptText,
    model: node.data.model,
    adhereToScript: true,
    shotNotes: [plan.shotNotes, plan.segmentIndex > 1 ? `Segment ${plan.segmentIndex} of ${plan.segmentCount}` : ""]
      .filter(Boolean)
      .join("\n"),
    referenceImageUrl: plan.media.imageUrl,
    referenceImageUrls: plan.media.imageUrls,
    referenceVideoUrl: plan.media.videoUrl,
    videoOperation: node.data.videoOperation ?? "auto",
    style: {
      aspectRatio: node.data.aspectRatio,
      resolution: node.data.resolution,
      duration: node.data.duration,
      musicEnabled: true,
    },
  });

  const completed = await pollGenerationUntilComplete(started.jobId, {
    maxAttempts: 240,
    intervalMs: 5000,
  });

  if (!completed.videoUrl) {
    throw new Error("Video generation finished without a playable video URL.");
  }

  return {
    output: completed.videoUrl,
    videoUrl: completed.videoUrl,
    jobId: started.jobId,
    scriptText: started.scriptText ?? plan.scriptText,
    prompt: plan.shotNotes || plan.visualDirection.slice(0, 500),
  };
}

export async function runStudioNode(
  node: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  const upstream = getUpstreamNodes(node.id, nodes, edges);

  switch (node.type) {
    case "prompt":
      return runPromptNode(node, upstream);
    case "character":
      return runCharacterNode(node, upstream);
    case "audio":
      return runAudioNode(node, upstream);
    case "image":
      return runImageNode(node, nodes, edges);
    case "video":
      return runVideoNode(node, nodes, edges);
    default:
      throw new Error("Unknown node type.");
  }
}
