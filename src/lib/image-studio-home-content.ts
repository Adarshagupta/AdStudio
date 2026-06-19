import {
  MARKETING_IMAGE_GENERATION,
  MARKETING_PRODUCT_AD,
} from "@/lib/marketing-assets";

export type InspirationFilter = "all" | "product-poster" | "text-poster" | "social-ad";

export type MarketingFeature = {
  id: string;
  title: string;
  badge?: { label: string; tone: "orange" | "pink" | "violet" };
  previewImage: string;
  previewRotate?: number;
  href: string;
};

export type QuickTool = {
  id: string;
  label: string;
  previewImage: string;
  href: string;
};

export type InspirationItem = {
  id: string;
  imageUrl: string;
  category: Exclude<InspirationFilter, "all">;
  alt: string;
};

export const INSPIRATION_FILTERS: { id: InspirationFilter; label: string }[] = [
  { id: "all", label: "All images" },
  { id: "product-poster", label: "Product poster" },
  { id: "text-poster", label: "Text poster" },
  { id: "social-ad", label: "Social ad" },
];

export const MARKETING_FEATURES: MarketingFeature[] = [
  {
    id: "ai-design",
    title: "AI design",
    badge: { label: "Flux Schnell", tone: "pink" },
    previewImage: MARKETING_IMAGE_GENERATION,
    previewRotate: 8,
    href: "/studio/image/edit",
  },
  {
    id: "ai-background",
    title: "AI background",
    badge: { label: "New update", tone: "orange" },
    previewImage: MARKETING_PRODUCT_AD,
    previewRotate: -6,
    href: "/studio/image/edit",
  },
  {
    id: "remove-background",
    title: "Remove background",
    previewImage: MARKETING_IMAGE_GENERATION,
    previewRotate: 4,
    href: "/studio/image/edit",
  },
  {
    id: "layout-to-design",
    title: "Layout to design",
    previewImage: MARKETING_PRODUCT_AD,
    previewRotate: -4,
    href: "/studio/image/edit",
  },
];

export const QUICK_TOOLS: QuickTool[] = [
  {
    id: "ai-enhance",
    label: "AI enhance",
    previewImage: MARKETING_IMAGE_GENERATION,
    href: "/studio/image/edit",
  },
  {
    id: "upscale",
    label: "Upscale image",
    previewImage: MARKETING_PRODUCT_AD,
    href: "/studio/image/edit",
  },
  {
    id: "editor",
    label: "Image editor",
    previewImage: MARKETING_IMAGE_GENERATION,
    href: "/studio/image/edit",
  },
];

export const INSPIRATION_ITEMS: InspirationItem[] = [
  {
    id: "inspo-1",
    imageUrl: MARKETING_IMAGE_GENERATION,
    category: "product-poster",
    alt: "Product poster inspiration",
  },
  {
    id: "inspo-2",
    imageUrl: MARKETING_PRODUCT_AD,
    category: "text-poster",
    alt: "Text poster inspiration",
  },
  {
    id: "inspo-3",
    imageUrl: MARKETING_IMAGE_GENERATION,
    category: "social-ad",
    alt: "Social ad inspiration",
  },
  {
    id: "inspo-4",
    imageUrl: MARKETING_PRODUCT_AD,
    category: "product-poster",
    alt: "Product marketing inspiration",
  },
  {
    id: "inspo-5",
    imageUrl: MARKETING_IMAGE_GENERATION,
    category: "text-poster",
    alt: "Typography poster inspiration",
  },
  {
    id: "inspo-6",
    imageUrl: MARKETING_PRODUCT_AD,
    category: "social-ad",
    alt: "Social creative inspiration",
  },
];
