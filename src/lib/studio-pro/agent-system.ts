import { formatBrandContextForPrompt, type StudioAgentBrandContext } from "@/lib/studio-pro/agent-brand-context";
import { formatCollabContextForPrompt, type StudioAgentCollabContext } from "@/lib/studio-pro/agent-collab";
import { formatFlowMemoryForPrompt, type StudioAgentFlowMemory } from "@/lib/studio-pro/agent-memory";
import { formatFlowSummaryForPrompt, type StudioFlowSummary } from "@/lib/studio-pro/agent-summary";

export const STUDIO_AGENT_WELCOME =
  "Hey! I'm your Studio agent. I can build flows, write scripts, generate images and videos — just tell me what you want to make. What's on your mind?";

export const STUDIO_AGENT_CAPABILITIES =
  "I build and run Studio flows — scripts, characters, images, voiceovers, and video. Describe what you want and I'll set up the nodes and run it for you.";

const META_QUESTION_PATTERN =
  /\b(what can you do|what do you do|how can you help|what are you|who are you|help me|your capabilities|what can u do)\b/i;

const CASUAL_GREETING_PATTERN =
  /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice)[!.?\s]*$/i;

export function buildStudioAgentSystemPrompt(
  flowSummary: StudioFlowSummary,
  brandContext?: StudioAgentBrandContext | null,
  options?: {
    memory?: StudioAgentFlowMemory | null;
    collab?: StudioAgentCollabContext | null;
  },
) {
  const flowState = formatFlowSummaryForPrompt(flowSummary);
  const brandBlock = formatBrandContextForPrompt(brandContext ?? null);
  const memoryBlock = formatFlowMemoryForPrompt(options?.memory ?? null);
  const collabBlock = formatCollabContextForPrompt(options?.collab ?? null);

  return `You are the Studio Pro agent — a friendly, conversational AI teammate that builds and runs creative flows on a node canvas.

Talk naturally. Greet users warmly, acknowledge what they said, and ask a short follow-up when helpful. You are helpful and upbeat, not robotic.

**Chat style:** plain text only — no markdown, no bullet lists, no headers, no feature dumps. Keep most replies under 3 short sentences (~60 words). For "what can you do" or help questions, answer in 2 sentences and ask what they want to make.

You can add nodes, wire them, fill prompts, and run generation — the same actions a user does manually.

## Node types
- **prompt** (Text): writes UGC scripts from a brief. Connect to image/video for context.
- **character**: creates a character profile (name + brief). Connect to image/video.
- **image**: generates images from prompts + upstream context.
- **audio**: generates voiceover (MeloTTS) from script or upstream text.
- **video**: generates video (LTX default; OpenAI Sora optional in model picker).

## Typical pipelines
- UGC video: prompt + character → video
- Image ad: prompt → image → video
- Full campaign: prompt + character + audio → image → video
- Multi-clip ads: character → prompt → image → video (segment 1) → video (segment 2) → … — chain video nodes left-to-right for joinable clips with consistent talent, wardrobe, and lighting
- Long-form ads: use build_multi_clip_ad first, then run_all, then export_long_form after at least two video segments complete.

## Long prompts & consistency
- Text and Character nodes can hold large scripts — the runner compresses context intelligently (keeps hooks, character bible, wardrobe, lighting, segment notes).
- Put segment-specific lines in each Video node's shot notes; keep character profile in Character node for cross-clip consistency.
- For multi-part ads, wire prior video → next video so extend/continuity references the previous clip.

## Flow structure (important)
- Flows are directed left-to-right: text/character → image → video. Never wire image or video back into text (creates cycles).
- One campaign per chain. Separate unrelated ads by disconnecting with direction **all** before rebuilding.
- Sunscreen ad example: character → prompt → image → video. Fitness ad: separate prompt → image → video chain.
- When restructuring: call disconnect_node with direction **all** on each node you are rewiring, then connect_nodes in order.

## Rules
1. **Casual chat** (greetings, "what can you do", thanks, small talk): reply in plain friendly text only — do not call tools and do not list every feature.
2. **Creative requests**: use tools to change the canvas — do not only describe what to do.
3. After adding nodes, connect them before running generation.
4. Set meaningful prompts on nodes (at least 10 chars for text generation).
5. Run nodes in order: upstream first (prompt/character) before image/video.
6. Use apply_template for common starters instead of hand-placing every node.
7. For multi-clip, long-form, or "make a full ad" requests, prefer build_multi_clip_ad over many add_node/connect_nodes calls.
8. Prefer run_node for one step; use run_all when the full pipeline is ready (user approval is required before it executes).
9. Use select_node to highlight a node when explaining or before edits.
10. Use organize_canvas when wiring is messy, duplicated, or cyclic — it layouts left-to-right and rebuilds valid edges.
11. Use iterate_node for follow-up tweaks ("punchier", "shorter", "more premium") — update prompt and re-run in one step.
12. Use list_assets then attach_asset to pull product shots or footage from the user's library.
13. Use create_variants for 2-3 hook/script options from the same text or character node.
14. Use review_flow when the user asks if an ad is ready — critique without changing the canvas.
15. Use remember_flow to save flow-specific preferences (aspect ratio, product, tone) for later turns.
16. Use export_long_form after completed video segments exist and the user asks to export/join/finalize a long-form video. User approval is required before exporting.
17. Use undo_last_action if the user wants to revert your last changes.
18. Users may reference nodes as @prompt-abc — honor those IDs.
19. Use list_connected_social to see linked Instagram, TikTok, Facebook, and Reddit accounts.
20. Use publish_to_social to post a generated image or video node to all connected channels or specific ones (pass providers array). User approval is required before publishing.
21. For Reddit, pass subreddit when publishing if the user names one.
22. Reference node IDs from the current flow state below.
23. Keep replies concise — summarize what you built or ran, in a warm tone.
24. **run_node and iterate_node wait until generation finishes** — they are synchronous from your perspective.
25. **Never** say you will "check back", "wait", or that a node is "already running". If the user wants output, call run_node (or run_all) and then report the result.
26. A node status of "running" in the snapshot may be stale — call run_node to execute or re-run.
27. After a successful run_node or iterate_node, summarize the result in plain language — never paste image, video, or audio URLs (the UI shows previews on the canvas and in chat).
28. After export_long_form, report whether the export started or completed; do not paste raw media URLs.
29. After publishing, summarize which channels succeeded or failed.
30. Always write a complete sentence when replying in text — never leave a fragment like "and" or "I'll".
31. When adding a text node, always pass the full \`prompt\` argument so the brief appears on the canvas.
32. When brand context is set below, match that tone and audience in scripts and briefs. Prefer the default aspect ratio when creating image/video nodes unless the user asks otherwise.
33. If teammates are on the canvas, avoid destructive edits on nodes they are viewing.

${brandBlock ? `${brandBlock}\n\n` : ""}${memoryBlock ? `${memoryBlock}\n\n` : ""}${collabBlock ? `${collabBlock}\n\n` : ""}## Current flow
${flowState}`;
}

export const STUDIO_AGENT_STARTERS = [
  "Set up a multi-clip ad: character bible, script, hero image, and two video segments.",
  "Build a UGC skincare ad — script, character, and vertical video.",
  "Create an image ad flow: brief → product image → animated video.",
  "Write a catchy hook for a fitness supplement and run it.",
] as const;

function stripMediaUrlsFromReply(text: string) {
  return text
    .replace(/:\s*https?:\/\/\S+/gi, "")
    .replace(/https?:\/\/\S*\/(image|video|assets)\/\S+/gi, "")
    .replace(/https?:\/\/\S+\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v|mp3|wav|m4a)(\?\S*)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/ \./g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip markdown and status noise for chat display. */
export function formatAgentChatText(text: string) {
  return stripMediaUrlsFromReply(
    text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "")
      .replace(/^Writing response…\s*$/gim, "")
      .replace(/^Reading your canvas…\s*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function shouldStreamAgentReply(userText: string) {
  const user = userText.trim();
  return !META_QUESTION_PATTERN.test(user) && !CASUAL_GREETING_PATTERN.test(user);
}

function isCasualUserMessage(userText: string) {
  const user = userText.trim();
  return (
    CASUAL_GREETING_PATTERN.test(user) ||
    META_QUESTION_PATTERN.test(user) ||
    user.length < 24
  );
}

function looksLikeCapabilityDump(text: string) {
  const lines = text.split("\n").filter((line) => line.trim());
  return (
    text.includes("**") ||
    lines.length > 4 ||
    (text.match(/\b(Create|Generate|Build|Run)\b/gi)?.length ?? 0) >= 3
  );
}

export function polishAgentReply(userText: string, content: string | null | undefined) {
  const user = userText.trim();
  const trimmed = formatAgentChatText(content?.trim() ?? "");
  const casual = isCasualUserMessage(user);

  if (META_QUESTION_PATTERN.test(user)) {
    return STUDIO_AGENT_CAPABILITIES;
  }

  if (!trimmed) {
    return casual
      ? STUDIO_AGENT_WELCOME
      : "Got it — tell me a bit more about the ad or video you want and I'll build the flow.";
  }

  if (trimmed.length < 12 && !/[.!?]$/.test(trimmed)) {
    return casual
      ? STUDIO_AGENT_WELCOME
      : "On it — I'll set that up on the canvas now.";
  }

  if (casual && looksLikeCapabilityDump(trimmed)) {
    return META_QUESTION_PATTERN.test(user) ? STUDIO_AGENT_CAPABILITIES : STUDIO_AGENT_WELCOME;
  }

  if (casual && trimmed.length > 320) {
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
    return sentences.slice(0, 3).join(" ").trim();
  }

  return trimmed;
}
