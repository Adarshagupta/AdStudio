import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import {
  buildAudioDirection,
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

  const data = (await response.json()) as { scriptText?: string; error?: string };
  if (!response.ok || !data.scriptText) {
    throw new Error(data.error ?? "Voiceover script generation failed.");
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
    body: JSON.stringify({ format: "UGC", prompt, model: node.data.model }),
  });

  const data = (await response.json()) as { scriptText?: string; error?: string };
  if (!response.ok || !data.scriptText) {
    throw new Error(data.error ?? "Script generation failed.");
  }

  await sleep(500);
  return { output: data.scriptText, scriptText: data.scriptText, prompt: node.data.prompt ?? prompt };
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

  const data = (await response.json()) as { output?: string; scriptText?: string; error?: string };
  if (!response.ok || !data.output) {
    throw new Error(data.error ?? "Character generation failed.");
  }

  return {
    output: data.output,
    scriptText: data.scriptText ?? data.output,
    prompt: node.data.prompt,
    characterName: node.data.characterName,
  };
}

export async function runAudioNode(node: StudioNode, upstream: StudioNode[]) {
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

  const data = (await response.json()) as { audioUrl?: string; error?: string };
  if (!response.ok || !data.audioUrl) {
    throw new Error(data.error ?? "Audio generation failed.");
  }

  return {
    output: data.audioUrl,
    audioUrl: data.audioUrl,
    prompt: speech,
    scriptText: speech,
    audioTitle: node.data.audioTitle,
    voiceStyle: node.data.voiceStyle,
  };
}

export async function runImageNode(node: StudioNode, upstream: StudioNode[]) {
  const prompt = resolveNodePrompt(node, upstream);
  if (!prompt || prompt.length < 10) {
    throw new Error("Add a prompt (min 10 characters) or connect an upstream node.");
  }

  const response = await fetch("/api/studio/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: node.data.model,
      aspectRatio: node.data.aspectRatio,
    }),
  });

  const data = (await response.json()) as { imageUrl?: string; error?: string };
  if (!response.ok || !data.imageUrl) {
    throw new Error(data.error ?? "Image generation failed.");
  }

  return { output: data.imageUrl, imageUrl: data.imageUrl, prompt: node.data.prompt ?? prompt };
}

export async function runVideoNode(node: StudioNode, upstream: StudioNode[]) {
  const scriptNode = upstream.find((item) => item.data.scriptText || item.type === "prompt");
  const scriptText =
    upstream.find((item) => item.data.scriptText)?.data.scriptText ??
    scriptNode?.data.output ??
    "";

  const prompt = resolveNodePrompt(node, upstream) || scriptText;
  if (!prompt || prompt.length < 10) {
    throw new Error("Add a prompt or connect upstream nodes before generating video.");
  }

  const started = await startGeneration({
    format: "UGC",
    prompt,
    scriptText: scriptText || prompt,
    model: node.data.model,
    style: {
      aspectRatio: node.data.aspectRatio,
      resolution: node.data.resolution === "720p" ? "720p" : "480p",
    },
  });

  const completed = await pollGenerationUntilComplete(started.jobId);

  return {
    output: completed.videoUrl,
    videoUrl: completed.videoUrl,
    jobId: started.jobId,
    scriptText: started.scriptText ?? scriptText,
    prompt: node.data.prompt ?? prompt,
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
      return runImageNode(node, upstream);
    case "video":
      return runVideoNode(node, upstream);
    default:
      throw new Error("Unknown node type.");
  }
}
