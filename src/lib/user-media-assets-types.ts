export type UserMediaAssetDto = {
  id: string;
  kind: "image" | "audio" | "video";
  source: "uploaded" | "generated";
  url: string;
  name: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  byteSize: number | null;
  createdAt: string;
};
