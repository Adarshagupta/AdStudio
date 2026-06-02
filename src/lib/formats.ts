import type { GenerationFormat } from "@prisma/client";

export type FormatConfig = {
  slug: string;
  format: GenerationFormat;
  name: string;
  description: string;
  tone: "zinc" | "purple" | "amber" | "emerald";
};

export const formatCards: FormatConfig[] = [
  {
    slug: "ugc-talking-head",
    format: "UGC",
    name: "UGC Talking Head",
    description: "Creator-led product scripts for paid social.",
    tone: "zinc",
  },
  {
    slug: "split-screen",
    format: "UGC",
    name: "Split Screen",
    description: "Narration paired with product proof and motion.",
    tone: "purple",
  },
  {
    slug: "brain-rot",
    format: "BRAIN_ROT",
    name: "Subway Surfers / Brain Rot",
    description: "Fast edits, captions, and retention hooks.",
    tone: "amber",
  },
  {
    slug: "review-style",
    format: "REVIEW",
    name: "Review Style",
    description: "Proof-driven review ads with clear outcomes.",
    tone: "emerald",
  },
];

export const quickActions = [
  { label: "Create UGC video", slug: "ugc-talking-head" },
  { label: "Create brain rot", slug: "brain-rot" },
  { label: "Create review ad", slug: "review-style" },
  { label: "Product marketing", slug: "ugc-talking-head" },
] as const;

export function getFormatBySlug(slug: string) {
  return formatCards.find((format) => format.slug === slug);
}

export function formatLabel(format: GenerationFormat) {
  if (format === "BRAIN_ROT") return "Brain rot";
  if (format === "STATIC") return "Static";
  if (format === "REVIEW") return "Review";
  return "UGC";
}
