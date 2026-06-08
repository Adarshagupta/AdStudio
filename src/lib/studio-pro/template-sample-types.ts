export type TemplateSampleOutput = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  type: "image" | "video";
  url: string;
};

export function parseSampleOutputs(value: unknown): TemplateSampleOutput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const nodeId = typeof record.nodeId === "string" ? record.nodeId : "";
    const nodeTitle = typeof record.nodeTitle === "string" ? record.nodeTitle : "Output";
    const type = record.type === "image" || record.type === "video" ? record.type : null;
    const url = typeof record.url === "string" ? record.url.trim() : "";

    if (!id || !nodeId || !type || !url) {
      return [];
    }

    return [{ id, nodeId, nodeTitle, type, url }];
  });
}

export function templateSampleCoverUrl(samples: TemplateSampleOutput[]) {
  const image = samples.find((sample) => sample.type === "image");
  if (image) {
    return image.url;
  }

  return samples[0]?.url ?? null;
}
