import {
  MARKETING_IMAGE_GENERATION,
  MARKETING_PRODUCT_AD,
} from "@/lib/marketing-assets";
import { LANDING_PREVIEW_VIDEOS } from "@/lib/landing-media";

/** Unique preview clips — no duplicates (used across dashboard + inspiration feed). */
export const FEATURED_INSPIRATION_VIDEOS = [
  "https://cdn.aorizon.cn/output/720p_h265/user-uploads/1000000000013/videos/video-1781002816972-4evq9xnzkpa-raw/video.mp4?v=2",
  "https://cdn.aorizon.cn/output/720p_h265/user-uploads/1000000000006/videos/video-1780925988521-idb1rs3nci-raw/video.mp4?v=2",
  "https://cdn.aorizon.cn/output/720p_h265/model-gen-video/901626772_0-b95110c8-794f-4913-a749-059971d7465d/video.mp4?v=2",
  "https://cdn.aorizon.cn/output/720p_h265/user-uploads/1000000000012/videos/video-1779274348299-d9tq2wr9su8-raw/video.mp4?v=2",
  ...LANDING_PREVIEW_VIDEOS,
] as const;

export type InspirationBadge = "Hot" | "Free" | "New" | "Trending";

export type FeatureSpotlight = {
  title: string;
  subtitle: string;
  href: string;
  previewVideo?: string;
  previewImage?: string;
  accent: "violet" | "sky" | "amber";
};

export type CommunityInspiration = {
  id: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  badge: InspirationBadge;
  rating: number;
  author: string;
  views: string;
  likes: string;
  featured?: boolean;
};

export type CreativeHighlight = {
  id: string;
  title: string;
  description: string;
  href: string;
  imageUrl?: string;
  videoUrl?: string;
  featured?: boolean;
  tag?: string;
  ctaLabel?: string;
};

export const FEATURE_SPOTLIGHTS: FeatureSpotlight[] = [
  {
    title: "Image Generation",
    subtitle: "Intelligent drawing, instant artistry",
    href: "/studio/image",
    previewImage: MARKETING_IMAGE_GENERATION,
    accent: "violet",
  },
  {
    title: "Video Generation",
    subtitle: "Cinematic ads from a single prompt",
    href: "/dashboard",
    previewVideo: FEATURED_INSPIRATION_VIDEOS[10],
    accent: "sky",
  },
  {
    title: "Studio Pro",
    subtitle: "Node-based flows for ad automation",
    href: "/studio-pro",
    previewVideo: FEATURED_INSPIRATION_VIDEOS[9],
    accent: "amber",
  },
];

export const COMMUNITY_INSPIRATION: CommunityInspiration[] = [
  {
    id: "kling-style",
    title: "UGC Talking Head",
    subtitle: "Creator-led product scripts for paid social",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[0],
    badge: "Hot",
    rating: 4.8,
    author: "LiteMoov",
    views: "12.4k",
    likes: "892",
    featured: true,
  },
  {
    id: "brain-rot",
    title: "Brain Rot Video",
    subtitle: "Fast edits, captions, and retention hooks",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[1],
    badge: "Trending",
    rating: 4.6,
    author: "LiteMoov",
    views: "8.1k",
    likes: "654",
  },
  {
    id: "split-screen",
    title: "Split Screen Ad",
    subtitle: "Narration paired with product proof",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[2],
    badge: "New",
    rating: 4.7,
    author: "LiteMoov",
    views: "5.3k",
    likes: "421",
  },
  {
    id: "review-style",
    title: "Review Style",
    subtitle: "Proof-driven review ads with clear outcomes",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[3],
    badge: "Free",
    rating: 4.5,
    author: "LiteMoov",
    views: "3.9k",
    likes: "318",
  },
  {
    id: "product-ad",
    title: "Product Marketing",
    subtitle: "Scroll-stopping hooks for e-commerce",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[4],
    badge: "Hot",
    rating: 4.9,
    author: "LiteMoov",
    views: "15.2k",
    likes: "1.1k",
  },
  {
    id: "social-cut",
    title: "Social Cut",
    subtitle: "Short-form vertical ads that convert",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[5],
    badge: "Trending",
    rating: 4.4,
    author: "LiteMoov",
    views: "6.7k",
    likes: "502",
  },
];

export const CREATIVE_HIGHLIGHTS: CreativeHighlight[] = [
  {
    id: "studio-pro-flows",
    title: "Build ad flows in Studio Pro",
    description: "Connect image, video, and schedule nodes into automated campaigns that run on their own.",
    href: "/studio-pro",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[6],
    featured: true,
    tag: "Featured",
    ctaLabel: "Open Studio Pro",
  },
  {
    id: "inspiration-feed",
    title: "Browse inspiration",
    description: "Scroll through vertical ad examples in a TikTok-style full-screen feed.",
    href: "/inspiration",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[7],
    tag: "Community",
    ctaLabel: "View feed",
  },
  {
    id: "marketplace",
    title: "Template marketplace",
    description: "Start from published flows and customize them for your brand in minutes.",
    href: "/studio-pro/marketplace",
    videoUrl: FEATURED_INSPIRATION_VIDEOS[8],
    tag: "Templates",
    ctaLabel: "Browse templates",
  },
  {
    id: "image-studio",
    title: "Edit creatives in Image Studio",
    description: "Layer editing, AI generate, remove background, upscale, and export.",
    href: "/studio/image",
    imageUrl: MARKETING_PRODUCT_AD,
    tag: "Image tools",
    ctaLabel: "Open editor",
  },
];
