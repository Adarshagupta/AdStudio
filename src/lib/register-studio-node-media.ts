import type { StudioNode } from "@/lib/studio-pro/types";
import { registerUserAssetQuiet } from "@/lib/user-assets-client";

/** Save generated or uploaded node media into the user's asset library. */
export function registerStudioNodeMedia(node: StudioNode) {
  const source = node.data.mediaSource === "upload" ? "uploaded" : "generated";

  if (node.type === "image" && node.data.imageUrl) {
    registerUserAssetQuiet({
      url: node.data.imageUrl,
      kind: "image",
      source,
      width: node.data.imageWidth,
      height: node.data.imageHeight,
      name: node.title,
    });
    return;
  }

  if (node.type === "audio" && node.data.audioUrl) {
    registerUserAssetQuiet({
      url: node.data.audioUrl,
      kind: "audio",
      source,
      name: node.data.audioTitle || node.title,
    });
    return;
  }

  if (node.type === "video" && node.data.videoUrl) {
    registerUserAssetQuiet({
      url: node.data.videoUrl,
      kind: "video",
      source,
      width: node.data.videoWidth,
      height: node.data.videoHeight,
      name: node.title,
    });
  }
}
