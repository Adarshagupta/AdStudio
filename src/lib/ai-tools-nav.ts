import type { ChatToolMode } from "@/lib/dashboard-chat";

export type NavBadge = "hot" | "new";

export type AIToolLink = {
  label: string;
  href: string;
  badge?: NavBadge;
};

export type AIToolColumn = {
  title: string;
  items: AIToolLink[];
  exploreMoreHref: string;
};

export type FeaturedModelLink = {
  label: string;
  href: string;
  badge?: NavBadge;
};

export function aiToolChatHref(prompt: string, tool: ChatToolMode = "video") {
  const params = new URLSearchParams({ prompt, tool });
  return `/dashboard/chat?${params.toString()}`;
}

export const AI_TOOLS_COLUMNS: AIToolColumn[] = [
  {
    title: "AI Video",
    exploreMoreHref: "/dashboard/chat?tool=video&prompt=Create+a+short-form+AI+video",
    items: [
      { label: "Text to video", href: aiToolChatHref("Create a cinematic short video from this idea"), badge: "hot" },
      { label: "Image to video", href: aiToolChatHref("Animate this image into a smooth short video") },
      { label: "Mimic Motion", href: aiToolChatHref("Recreate this motion style in a new video") },
      { label: "AI Twerk Generator", href: aiToolChatHref("Create a fun dance motion video"), badge: "new" },
      { label: "AI baseball broadcast", href: aiToolChatHref("Sports broadcast style highlight reel") },
      { label: "Time Freeze Effect", href: aiToolChatHref("Dramatic time freeze effect video"), badge: "new" },
      { label: "Crossover Fights", href: aiToolChatHref("Epic crossover fight scene video") },
    ],
  },
  {
    title: "AI Image",
    exploreMoreHref: "/studio/image",
    items: [
      { label: "Text to Image", href: aiToolChatHref("Generate a polished ad image from this brief", "image"), badge: "hot" },
      { label: "Image to image", href: "/studio/image/edit" },
      { label: "AI Baby Generator", href: aiToolChatHref("Cute baby portrait in soft studio lighting", "image") },
      { label: "Polaroid Photo Effect", href: "/studio/image/edit" },
      { label: "AI Selfie with Celebrity", href: aiToolChatHref("Selfie photo with a celebrity-style portrait", "image") },
      { label: "AI Outfit Generator", href: aiToolChatHref("Fashion outfit lookbook product shot", "image") },
      { label: "Comic AI Generator", href: aiToolChatHref("Bold comic-book style illustration", "image") },
    ],
  },
  {
    title: "Video Effects",
    exploreMoreHref: "/inspiration",
    items: [
      { label: "Blowing a Kiss", href: aiToolChatHref("Playful blowing a kiss video effect"), badge: "hot" },
      { label: "Send Flowers", href: aiToolChatHref("Romantic send flowers video effect") },
      { label: "Dolly Zoom", href: aiToolChatHref("Cinematic dolly zoom effect") },
      { label: "Get Rich", href: aiToolChatHref("Luxury get rich lifestyle video") },
      { label: "AI Hug Effect", href: aiToolChatHref("Warm AI hug video effect") },
      { label: "AI Car Effect", href: aiToolChatHref("Sleek automotive reveal video") },
      { label: "AI Birthday Effect", href: aiToolChatHref("Celebratory birthday video effect") },
    ],
  },
  {
    title: "Official",
    exploreMoreHref: "/studio/image",
    items: [
      { label: "Motion Control", href: "/studio-pro", badge: "hot" },
      { label: "AI Filter", href: "/studio/image/edit" },
      { label: "AI Image Upscaler", href: "/studio/image/edit" },
      { label: "AI Background Remover", href: "/studio/image/edit" },
      { label: "AI Makeup", href: "/studio/image/edit" },
      { label: "AI Eraser", href: "/studio/image/edit" },
      { label: "Seedance 2.0", href: aiToolChatHref("Create a dynamic Seedance-style motion video"), badge: "new" },
    ],
  },
];

export const AI_TOOLS_FEATURED_MODELS: FeaturedModelLink[] = [
  { label: "Seedance 2.0", href: aiToolChatHref("Seedance 2.0 motion video"), badge: "hot" },
  { label: "Nano Banana 2", href: aiToolChatHref("Nano Banana 2 stylized video"), badge: "hot" },
  { label: "Seedream 5.0", href: aiToolChatHref("Seedream 5.0 cinematic video") },
  { label: "Kling 3.0", href: aiToolChatHref("Kling 3.0 high quality video") },
  { label: "Wan 2.6", href: aiToolChatHref("Wan 2.6 image to video") },
  { label: "Veo 3.1", href: aiToolChatHref("Veo 3.1 premium video") },
  { label: "Sora 2", href: aiToolChatHref("Sora 2 cinematic ad video") },
  { label: "Vidu Q3 Pro", href: aiToolChatHref("Vidu Q3 Pro motion video") },
];

export const AI_TOOLS_APP_LINK = {
  label: "Get the LiteMoov app",
  href: "/signup",
  description: "Install the PWA for faster creation on desktop and mobile.",
};

export const PUBLIC_NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Studio Pro", href: "/#studio" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
] as const;

export const LANDING_NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Studio Pro", href: "#studio" },
  { label: "Blog", href: "/blog" },
  { label: "Plans", href: "#plans" },
] as const;
