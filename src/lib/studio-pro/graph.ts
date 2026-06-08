import {
  compressContextSections,
  compressStudioContextText,
  compressStudioScriptText,
  STUDIO_CONTEXT_BUDGETS,
  type ContextSection,
} from "@/lib/studio-pro/context-compression";
import { formatStudioNodeText } from "@/lib/studio-pro/display-text";
import { stripEmbeddedMediaUrls, summarizeMediaUrl, truncateTextPrompt } from "@/lib/text-prompt";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import { getNodeHeight } from "@/lib/studio-pro/types";

export function getPortPosition(node: StudioNode, side: "input" | "output", height = getNodeHeight(node)) {
  const y = node.y + height / 2;
  const x = side === "input" ? node.x : node.x + node.width;
  return { x, y };
}

export function getIncomingEdges(nodeId: string, edges: StudioEdge[]) {
  return edges.filter((edge) => edge.target === nodeId);
}

export function getOutgoingEdges(nodeId: string, edges: StudioEdge[]) {
  return edges.filter((edge) => edge.source === nodeId);
}

export function buildEdgePath(source: StudioNode, target: StudioNode) {
  const from = getPortPosition(source, "output");
  const to = getPortPosition(target, "input");
  const dx = Math.max(80, Math.abs(to.x - from.x) * 0.45);

  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

export function buildPreviewPath(source: StudioNode, target: { x: number; y: number }) {
  const from = getPortPosition(source, "output");
  const dx = Math.max(80, Math.abs(target.x - from.x) * 0.45);

  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${target.x - dx} ${target.y}, ${target.x} ${target.y}`;
}

export function wouldCreateCycle(source: string, target: string, edges: StudioEdge[]) {
  if (source === target) return true;

  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter((edge) => edge.source === current).forEach((edge) => stack.push(edge.target));
  }

  return false;
}

export function explainConnectFailure(source: string, target: string, edges: StudioEdge[]) {
  if (source === target) return "cannot connect a node to itself";
  if (edges.some((edge) => edge.source === source && edge.target === target)) {
    return "already connected";
  }
  if (wouldCreateCycle(source, target, edges)) {
    return "would create a cycle — remove conflicting edges with disconnect_node direction all first";
  }
  return "connection blocked";
}

export function findSnapTarget(
  point: { x: number; y: number },
  nodes: StudioNode[],
  sourceId: string,
  threshold = 44,
) {
  let closest: { nodeId: string; x: number; y: number; distance: number } | null = null;

  for (const node of nodes) {
    if (node.id === sourceId) continue;
    const port = getPortPosition(node, "input");
    const distance = Math.hypot(point.x - port.x, point.y - port.y);
    if (distance <= threshold && (!closest || distance < closest.distance)) {
      closest = { nodeId: node.id, x: port.x, y: port.y, distance };
    }
  }

  return closest;
}

export function getUpstreamNodes(nodeId: string, nodes: StudioNode[], edges: StudioEdge[]) {
  const sourceIds = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
  return nodes.filter((node) => sourceIds.includes(node.id));
}

/** All nodes upstream in the flow (not only direct parents). */
export function getAncestorNodes(nodeId: string, nodes: StudioNode[], edges: StudioEdge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ancestors: StudioNode[] = [];
  const visited = new Set<string>();
  const queue = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = byId.get(id);
    if (node) ancestors.push(node);

    edges
      .filter((edge) => edge.target === id)
      .forEach((edge) => {
        if (!visited.has(edge.source)) queue.push(edge.source);
      });
  }

  return ancestors;
}

function nodeTextContent(node: StudioNode) {
  const raw = node.data.scriptText || node.data.output || node.data.prompt || "";
  const text = formatStudioNodeText(raw) || raw.trim();
  return stripEmbeddedMediaUrls(text);
}

export type VideoMediaReference = {
  imageUrl?: string;
  imageUrls: string[];
  videoUrl?: string;
  imageSourceLabel?: string;
  videoSourceLabel?: string;
};

export type VideoGenerationPlan = {
  scriptText: string;
  scriptSourceLabel: string | null;
  visualDirection: string;
  shotNotes: string;
  continuityNotes: string;
  segmentIndex: number;
  segmentCount: number;
  media: VideoMediaReference;
};

function orderedAncestorVideos(videoNodeId: string, ancestors: StudioNode[]) {
  return ancestors
    .filter((node) => node.type === "video" && node.id !== videoNodeId)
    .sort((a, b) => a.x - b.x || a.y - b.y);
}

function buildCharacterConsistencyBible(characterNodes: StudioNode[]) {
  const sections: ContextSection[] = [];

  for (const node of characterNodes) {
    const name = node.data.characterName?.trim();
    const profile = stripEmbeddedMediaUrls(
      (node.data.output || node.data.scriptText || node.data.prompt || "").trim(),
    );
    const brief = node.data.prompt?.trim();

    if (!name && !profile && !brief) continue;

    const content = [profile, brief && profile && !profile.includes(brief) ? `Brief: ${brief}` : brief]
      .filter(Boolean)
      .join("\n");

    sections.push({
      label: name ? `Character bible (${name})` : `Character bible (${node.title || "character"})`,
      content,
      priority: "critical",
    });
  }

  return compressContextSections(sections, STUDIO_CONTEXT_BUDGETS.characterBible);
}

function buildClipContinuityContext(
  videoNode: StudioNode,
  ancestors: StudioNode[],
  nodes: StudioNode[],
  edges: StudioEdge[],
) {
  const upstreamVideos = orderedAncestorVideos(videoNode.id, ancestors);
  const directParents = getUpstreamNodes(videoNode.id, nodes, edges);
  const characterBible = buildCharacterConsistencyBible(ancestors.filter((node) => node.type === "character"));
  const segmentIndex = upstreamVideos.length + 1;
  const segmentCount = Math.max(segmentIndex, upstreamVideos.length);

  const parts: string[] = [
    "MULTI-CLIP CONTINUITY: Each video node is a joinable segment for final output. Keep the same on-camera talent, wardrobe, lighting, color grade, product placement, and set dressing across segments unless shot notes say otherwise.",
  ];

  if (upstreamVideos.length > 0) {
    const directVideo = directParents.find((node) => node.type === "video" && node.data.videoUrl);
    const chainLabel = directVideo
      ? `Continue directly from "${directVideo.title || "upstream clip"}"`
      : `Continue the ${upstreamVideos.length}-clip chain`;

    parts.push(
      `${chainLabel}. Match the end state of the prior clip (pose, expression, background) at the opening frame. End this segment on a clean cut point for editing.`,
    );

    for (let index = 0; index < upstreamVideos.length; index += 1) {
      const clip = upstreamVideos[index]!;
      const notes = (clip.data.prompt || "").trim();
      parts.push(
        `Prior segment ${index + 1} (${clip.title || "video"}): ${
          notes
            ? compressStudioContextText(notes, 220, { label: `Segment ${index + 1}` })
            : "Match subject, wardrobe, and lighting from the connected clip."
        }`,
      );
    }

    parts.push(`This render is segment ${segmentIndex} of an editable multi-clip ad.`);
  } else if (segmentCount > 1) {
    parts.push("First segment in a multi-clip ad — establish look, talent, and setting for downstream clips to match.");
  }

  if (characterBible) {
    parts.push(characterBible);
  }

  return compressStudioContextText(parts.join("\n\n"), STUDIO_CONTEXT_BUDGETS.continuityBlock, {
    label: "Continuity",
  });
}

export function buildVideoGenerationContext(
  videoNode: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
): VideoGenerationPlan {
  const ancestors = getAncestorNodes(videoNode.id, nodes, edges);
  const directParents = getUpstreamNodes(videoNode.id, nodes, edges);
  const upstreamVideos = orderedAncestorVideos(videoNode.id, ancestors);
  const shotNotes = compressStudioContextText(
    (videoNode.data.prompt || "").trim(),
    STUDIO_CONTEXT_BUDGETS.sectionShotNotes,
    { label: "Shot notes" },
  );
  const media: VideoMediaReference = { imageUrls: [] };

  let scriptText = "";
  let scriptSourceLabel: string | null = null;
  let scriptSourceId: string | null = null;

  const scriptPriority: StudioNode["type"][] = ["prompt", "character", "audio"];

  for (const type of scriptPriority) {
    for (const node of ancestors.filter((item) => item.type === type)) {
      const text = nodeTextContent(node);
      if (text.length >= 10 && text.length > scriptText.length) {
        scriptText = text;
        scriptSourceId = node.id;
        scriptSourceLabel = node.title || type;
      }
    }
    if (scriptText) break;
  }

  const visualSections: ContextSection[] = [];
  const continuityNotes = buildClipContinuityContext(videoNode, ancestors, nodes, edges);

  if (scriptSourceLabel) {
    visualSections.push({
      label: "Primary script source",
      content: `${scriptSourceLabel} node supplies spoken lines.`,
      priority: "high",
    });
  }

  for (const node of ancestors) {
    if (node.id === scriptSourceId) continue;

    if (node.type === "prompt") {
      const text = nodeTextContent(node);
      if (text) {
        visualSections.push({
          label: `Product / brief (${node.title || "text"})`,
          content: text,
          priority: "high",
        });
      }
      continue;
    }

    if (node.type === "character") {
      const name = node.data.characterName?.trim();
      const profile = stripEmbeddedMediaUrls(
        (node.data.output || node.data.scriptText || node.data.prompt || "").trim(),
      );
      const content = [name ? `Talent: ${name}` : null, profile].filter(Boolean).join("\n");
      if (content) {
        visualSections.push({
          label: `On-camera talent (${name || node.title || "character"})`,
          content,
          priority: "critical",
        });
      }
      continue;
    }

    if (node.type === "audio") {
      const voiceScript = stripEmbeddedMediaUrls((node.data.prompt || node.data.output || "").trim());
      const title = node.data.audioTitle?.trim();
      const style = node.data.voiceStyle?.trim();
      const audioRef = summarizeMediaUrl(node.data.audioUrl);
      const lines = [
        audioRef ? `Voice reference (${node.title || "audio"}): ${audioRef}` : null,
        style ? `Voice delivery: ${style}` : null,
        title ? `Audio segment: ${title}` : null,
        voiceScript ? `Voice script excerpt: ${voiceScript}` : null,
      ].filter(Boolean) as string[];

      if (lines.length) {
        visualSections.push({
          label: `Audio direction (${node.title || "audio"})`,
          content: lines.join("\n"),
          priority: "normal",
        });
      }

      if (!scriptText && voiceScript.length >= 10) {
        scriptText = voiceScript;
        scriptSourceId = node.id;
        scriptSourceLabel = node.title || "audio";
      }
      continue;
    }

    if (node.type === "image") {
      if (node.data.imageUrl) {
        if (!media.imageUrl) {
          media.imageUrl = node.data.imageUrl;
          media.imageSourceLabel = node.title || "image";
        }
        if (!media.imageUrls.includes(node.data.imageUrl)) {
          media.imageUrls.push(node.data.imageUrl);
        }
        const refIndex = media.imageUrls.indexOf(node.data.imageUrl) + 1;
        visualSections.push({
          label: `Reference image @image${refIndex}`,
          content: `Match subject identity, wardrobe, lighting, and composition from ${node.title || "image"}${node.data.mediaSource === "upload" ? " (uploaded)" : ""}.`,
          priority: "critical",
        });
      }
      const imagePrompt = stripEmbeddedMediaUrls((node.data.prompt || node.data.output || "").trim());
      if (imagePrompt) {
        visualSections.push({
          label: `Image scene (${node.title || "image"})`,
          content: imagePrompt,
          priority: "high",
        });
      }
      continue;
    }

    if (node.type === "video" && node.id !== videoNode.id) {
      const clipNotes = (node.data.prompt || "").trim();
      visualSections.push({
        label: `Prior clip (${node.title || "video"})`,
        content:
          clipNotes ||
          "Preserve motion rhythm and visual identity from the connected clip while applying the script below.",
        priority: "high",
      });
      continue;
    }
  }

  const directVideoParent = directParents.find((node) => node.type === "video" && node.data.videoUrl);
  const chainVideo =
    directVideoParent?.data.videoUrl ??
    upstreamVideos.filter((node) => node.data.videoUrl).at(-1)?.data.videoUrl;

  if (chainVideo) {
    media.videoUrl = chainVideo;
    media.videoSourceLabel = directVideoParent?.title ?? upstreamVideos.at(-1)?.title ?? "video";
  }

  const visualDirection = compressContextSections(visualSections, STUDIO_CONTEXT_BUDGETS.visualDirection);

  return {
    scriptText: compressStudioScriptText(scriptText),
    scriptSourceLabel,
    visualDirection,
    shotNotes,
    continuityNotes,
    segmentIndex: upstreamVideos.length + 1,
    segmentCount: Math.max(upstreamVideos.length + 1, upstreamVideos.length),
    media,
  };
}

export type ImageGenerationPlan = {
  scenePrompt: string;
  shotNotes: string;
};

export function buildImageGenerationContext(
  imageNode: StudioNode,
  nodes: StudioNode[],
  edges: StudioEdge[],
): ImageGenerationPlan {
  const ancestors = getAncestorNodes(imageNode.id, nodes, edges);
  const shotNotes = compressStudioContextText(
    (imageNode.data.prompt || "").trim(),
    STUDIO_CONTEXT_BUDGETS.sectionShotNotes,
    { label: "Shot notes" },
  );
  const contextSections: ContextSection[] = [
    {
      label: "Frame goal",
      content:
        "Create one photorealistic UGC ad frame. Honor every upstream detail for on-camera talent, wardrobe, product, lighting, and setting. This frame anchors visual consistency for downstream video clips.",
      priority: "critical",
    },
  ];

  const characterBible = buildCharacterConsistencyBible(ancestors.filter((node) => node.type === "character"));
  if (characterBible) {
    contextSections.push({
      label: "Character consistency",
      content: characterBible,
      priority: "critical",
    });
  }

  for (const node of ancestors) {
    if (node.type === "prompt") {
      const text = nodeTextContent(node);
      if (text) {
        contextSections.push({
          label: `Campaign brief (${node.title || "text"})`,
          content: text,
          priority: "high",
        });
      }
      continue;
    }

    if (node.type === "character") {
      continue;
    }

    if (node.type === "audio") {
      const script = stripEmbeddedMediaUrls((node.data.prompt || node.data.output || "").trim());
      const style = node.data.voiceStyle?.trim();
      const title = node.data.audioTitle?.trim();
      const lines = [
        script ? `Voiceover / mood reference: ${script}` : null,
        style ? `Delivery tone: ${style}` : null,
        title ? `Audio segment: ${title}` : null,
      ].filter(Boolean) as string[];

      if (lines.length) {
        contextSections.push({
          label: `Audio mood (${node.title || "audio"})`,
          content: lines.join("\n"),
          priority: "normal",
        });
      }
      continue;
    }

    if (node.type === "image" && node.id !== imageNode.id) {
      const imagePrompt = stripEmbeddedMediaUrls((node.data.prompt || node.data.output || "").trim());
      const lines = [
        imagePrompt ? `Upstream image direction: ${imagePrompt}` : null,
        node.data.imageUrl
          ? "Match visual style from the connected upstream image (subject, lighting, color grade)."
          : null,
      ].filter(Boolean) as string[];

      if (lines.length) {
        contextSections.push({
          label: `Upstream image (${node.title || "image"})`,
          content: lines.join("\n"),
          priority: "high",
        });
      }
    }
  }

  if (shotNotes) {
    contextSections.push({
      label: "Composition / shot notes",
      content: shotNotes,
      priority: "high",
    });
  }

  const scenePrompt = compressContextSections(contextSections, STUDIO_CONTEXT_BUDGETS.scenePrompt);

  return { scenePrompt, shotNotes };
}

export function composePrompt(nodes: StudioNode[]) {
  const sections: ContextSection[] = nodes
    .map((node): ContextSection | null => {
      if (node.type === "prompt") {
        const text = nodeTextContent(node);
        return text
          ? { label: `Brief (${node.title || "text"})`, content: text, priority: "high" }
          : null;
      }
      if (node.type === "character") {
        const text =
          formatStudioNodeText(node.data.output || node.data.scriptText) ||
          (node.data.output || node.data.scriptText || "").trim();
        const name = node.data.characterName?.trim();
        const brief = node.data.prompt?.trim();
        const content = text
          ? stripEmbeddedMediaUrls(text)
          : name && brief
            ? `${name}: ${brief}`
            : name || brief || "";
        if (!content) return null;
        return {
          label: name ? `Character (${name})` : "Character profile",
          content,
          priority: "critical",
        };
      }
      if (node.type === "audio") {
        const script = stripEmbeddedMediaUrls(node.data.prompt?.trim() || node.data.output?.trim() || "");
        const title = node.data.audioTitle?.trim();
        const style = node.data.voiceStyle?.trim();
        const content = [
          script ? `Voiceover script: ${script}` : null,
          title ? `Track: ${title}` : null,
          style ? `Voice style: ${style}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        if (!content) return null;
        return { label: `Audio (${node.title || "audio"})`, content, priority: "normal" };
      }
      if (node.type === "image") {
        const notes = node.data.prompt?.trim();
        const label = node.data.mediaSource === "upload" ? "uploaded" : "generated";
        const content = notes
          ? `Connected image (${label}) — creator notes: ${notes}`
          : node.data.imageUrl || node.data.output
            ? `Connected image (${label}) — use the written brief only; do not invent image analysis.`
            : "";
        if (!content) return null;
        return { label: `Image (${node.title || "image"})`, content, priority: "normal" };
      }
      return null;
    })
    .filter((section): section is ContextSection => Boolean(section));

  return truncateTextPrompt(
    compressContextSections(sections, STUDIO_CONTEXT_BUDGETS.composeNode * Math.max(1, nodes.length)),
  );
}

export function getNodeLocalContent(node: StudioNode) {
  switch (node.type) {
    case "prompt": {
      const brief = (node.data.prompt ?? "").trim();
      if (brief) return stripEmbeddedMediaUrls(brief);
      return nodeTextContent(node);
    }
    case "character":
      if (node.data.output?.trim()) {
        return formatStudioNodeText(node.data.output) || node.data.output.trim();
      }
      {
        const name = node.data.characterName?.trim();
        const brief = node.data.prompt?.trim();
        if (name && brief) return `${name}: ${brief}`;
        return name || brief || "";
      }
    case "audio": {
      const raw = node.data.prompt || node.data.output || "";
      return formatStudioNodeText(raw) || raw.trim();
    }
    case "image":
    case "video":
      return (node.data.prompt || "").trim();
    default:
      return "";
  }
}

export function resolveNodePrompt(node: StudioNode, upstream: StudioNode[]) {
  const upstreamContext = composePrompt(upstream);
  const local = getNodeLocalContent(node);

  if (local && upstreamContext) {
    return truncateTextPrompt(`${upstreamContext}\n\n${local}`);
  }

  return truncateTextPrompt(local || upstreamContext || "");
}

export function extractSpeakableText(node: StudioNode) {
  const direct =
    node.data.scriptText?.trim() ||
    node.data.output?.trim() ||
    node.data.prompt?.trim() ||
    "";

  if (direct.length >= 3) {
    return direct;
  }

  if (node.type === "character") {
    const name = node.data.characterName?.trim();
    const brief = node.data.prompt?.trim();
    if (brief) return brief;
    if (name) return `Hi, I'm ${name}.`;
  }

  if (node.type === "audio") {
    const style = node.data.voiceStyle?.trim();
    const title = node.data.audioTitle?.trim();
    if (style && style.length >= 3) return style;
    if (title && title.length >= 3) return title;
    if (style && title) return `${title}. ${style}`;
  }

  return direct;
}

export function resolveAudioSpeech(node: StudioNode, upstream: StudioNode[]) {
  const localScript = node.data.prompt?.trim();
  if (localScript && localScript.length >= 3) {
    return localScript;
  }

  const localStyle = node.data.voiceStyle?.trim();
  if (localStyle && localStyle.length >= 3) {
    return localStyle;
  }

  for (const upstreamNode of upstream) {
    const text = extractSpeakableText(upstreamNode);
    if (text.length >= 3) {
      return text;
    }
  }

  const title = node.data.audioTitle?.trim();
  if (title && title.length >= 3) {
    return title;
  }

  const combined = [node.data.audioTitle?.trim(), node.data.voiceStyle?.trim()].filter(Boolean).join(". ");
  if (combined.length >= 3) {
    return combined;
  }

  return "";
}

export function buildAudioDirection(node: StudioNode, upstream: StudioNode[]) {
  return [
    composePrompt(upstream),
    node.data.audioTitle?.trim() ? `Track title: ${node.data.audioTitle}` : "",
    node.data.voiceStyle?.trim() ? `Voice style: ${node.data.voiceStyle}` : "",
    node.data.prompt?.trim() ? `Notes: ${node.data.prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function topologicalSort(nodes: StudioNode[], edges: StudioEdge[]) {
  const incoming = new Map<string, number>();
  nodes.forEach((node) => incoming.set(node.id, 0));
  edges.forEach((edge) => incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1));

  const queue = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
  const sorted: StudioNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    edges
      .filter((edge) => edge.source === node.id)
      .forEach((edge) => {
        const count = (incoming.get(edge.target) ?? 1) - 1;
        incoming.set(edge.target, count);
        if (count === 0) {
          const target = nodes.find((item) => item.id === edge.target);
          if (target) queue.push(target);
        }
      });
  }

  return sorted.length === nodes.length ? sorted : nodes;
}
