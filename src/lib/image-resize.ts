import "server-only";

import sharp from "sharp";

import { loadMediaBufferFromUrl } from "@/lib/media-url";

export function parsePixelSize(size: string) {
  const match = /^(\d+)x(\d+)$/.exec(size.trim());
  if (!match) {
    throw new Error(`Invalid image size "${size}".`);
  }

  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
  };
}

/** Cover-crop to exact pixels — required by OpenAI Sora image-to-video. */
export async function resizeImageToExactSize(input: {
  url: string;
  size: string;
  format?: "png" | "jpeg" | "webp";
}) {
  const { width, height } = parsePixelSize(input.size);
  const format = input.format ?? "png";
  const { buffer } = await loadMediaBufferFromUrl(input.url);

  let pipeline = sharp(buffer).rotate().resize(width, height, {
    fit: "cover",
    position: "centre",
  });

  if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  } else if (format === "webp") {
    pipeline = pipeline.webp({ quality: 92 });
  } else {
    pipeline = pipeline.png();
  }

  const resized = await pipeline.toBuffer();
  const mime =
    format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";

  return { buffer: resized, mime, width, height };
}
