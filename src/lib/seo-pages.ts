export type SeoLandingPage = {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  keywords: string[];
  ctaLabel: string;
  ctaHref: string;
  sections: ReadonlyArray<{ heading: string; body: string }>;
  faq?: ReadonlyArray<{ question: string; answer: string }>;
};

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  {
    slug: "text-to-video",
    title: "AI Text to Video Generator for Marketing Teams",
    metaDescription:
      "Turn scripts and product briefs into short-form marketing videos with LiteMoov's AI text-to-video generator. Create UGC-style ads, social clips, and campaign assets in minutes.",
    h1: "AI Text to Video Generator",
    subtitle:
      "Describe your idea and generate polished short-form videos for ads, social, and product launches — without a production crew.",
    keywords: [
      "text to video AI",
      "AI text to video generator",
      "script to video",
      "marketing video generator",
      "short-form video AI",
    ],
    ctaLabel: "Start creating videos",
    ctaHref: "/signup",
    sections: [
      {
        heading: "From brief to video in minutes",
        body:
          "Paste a script, product description, or creative prompt and LiteMoov generates cinematic clips, UGC-style ads, and social-ready videos using leading AI video models.",
      },
      {
        heading: "Built for performance marketing",
        body:
          "Iterate quickly on hooks, angles, and formats. Generate multiple variants for A/B tests, then refine winners in Studio Pro with editing, overlays, and publishing workflows.",
      },
      {
        heading: "Team-ready workflows",
        body:
          "Collaborate in shared workspaces, manage brand assets, and publish directly to Instagram, TikTok, Facebook, and Reddit from one platform.",
      },
    ],
    faq: [
      {
        question: "How long can AI-generated videos be?",
        answer:
          "LiteMoov is optimized for short-form marketing content. Plan quotas include included video minutes, with overage billing available on paid plans.",
      },
      {
        question: "Can I use text-to-video for UGC ads?",
        answer:
          "Yes. Many teams use LiteMoov to produce UGC-style ad concepts, product demos, and social hooks from written briefs before scaling winning creatives.",
      },
    ],
  },
  {
    slug: "ai-ugc-ads",
    title: "AI UGC Ad Generator — Create Authentic-Style Ads Fast",
    metaDescription:
      "Generate UGC-style ads with AI for TikTok, Instagram, and paid social. LiteMoov helps marketing teams produce authentic-feeling ad creative at scale.",
    h1: "AI UGC Ad Generator",
    subtitle:
      "Produce UGC-style ad concepts, hooks, and variations faster — so your team can test more angles and scale winners.",
    keywords: [
      "AI UGC ads",
      "UGC ad generator",
      "AI ad creator",
      "TikTok ad generator",
      "Instagram ad AI",
    ],
    ctaLabel: "Create UGC ads",
    ctaHref: "/signup",
    sections: [
      {
        heading: "Scale creative testing",
        body:
          "Generate multiple UGC-style concepts from a single product brief. Test hooks, personas, and formats without waiting on external creators for every iteration.",
      },
      {
        heading: "On-brand by default",
        body:
          "Store brand guidelines, reference assets, and approved outputs in your workspace so every generation stays aligned with your campaign direction.",
      },
      {
        heading: "End-to-end ad workflow",
        body:
          "Move from generation to refinement in Studio Pro, then publish or export assets for your ad platforms and organic channels.",
      },
    ],
    faq: [
      {
        question: "Are AI UGC ads suitable for paid social?",
        answer:
          "Teams use LiteMoov to produce concept ads, variations, and supplementary creative for paid social campaigns. Always follow platform ad policies and disclosure requirements.",
      },
    ],
  },
  {
    slug: "ai-image-generator",
    title: "AI Image Generator for Ads, Product Shots & Social Creative",
    metaDescription:
      "Generate ad images, product visuals, and social creative with LiteMoov's AI image generator. Edit, upscale, and remove backgrounds in the same workspace.",
    h1: "AI Image Generator for Marketing",
    subtitle:
      "Create campaign visuals, product mockups, and social graphics from text prompts — then edit them without leaving LiteMoov.",
    keywords: [
      "AI image generator",
      "AI ad images",
      "text to image marketing",
      "product shot AI",
      "social media image generator",
    ],
    ctaLabel: "Generate images",
    ctaHref: "/signup",
    sections: [
      {
        heading: "Text-to-image for campaigns",
        body:
          "Turn creative briefs into polished ad images, lifestyle shots, and social graphics using included image quotas and premium model credits.",
      },
      {
        heading: "Built-in editing tools",
        body:
          "Expand canvases, replace backgrounds, remove objects, and upscale assets with LiteMoov's integrated image editing studio.",
      },
      {
        heading: "Asset library for teams",
        body:
          "Save approved generations to your workspace library and reuse them across video workflows, Studio Pro flows, and social publishing.",
      },
    ],
  },
  {
    slug: "studio-pro",
    title: "Studio Pro — Visual AI Workflow Editor for Video Teams",
    metaDescription:
      "Studio Pro is LiteMoov's node-based editor for multi-step AI video and image pipelines. Build, collaborate, and publish complex creative workflows.",
    h1: "Studio Pro Workflow Editor",
    subtitle:
      "Design multi-step production pipelines on a visual canvas — combine generation, editing, and publishing with live team collaboration.",
    keywords: [
      "AI video workflow",
      "node-based video editor",
      "Studio Pro LiteMoov",
      "collaborative video editor",
      "AI production pipeline",
    ],
    ctaLabel: "Explore Studio Pro",
    ctaHref: "/signup",
    sections: [
      {
        heading: "Visual node editor",
        body:
          "Chain AI generation, transforms, and outputs in a node-based canvas designed for repeatable campaign production.",
      },
      {
        heading: "Real-time collaboration",
        body:
          "Work with teammates in the same flow with live cursors and synced state — ideal for agencies and in-house creative teams.",
      },
      {
        heading: "From pipeline to publish",
        body:
          "Connect generation steps to publishing and asset management so finished content moves quickly from idea to channel.",
      },
    ],
  },
  {
    slug: "social-media-video-generator",
    title: "Social Media Video Generator — TikTok, Reels & Shorts",
    metaDescription:
      "Create vertical social videos for TikTok, Instagram Reels, YouTube Shorts, and Facebook with LiteMoov's AI social media video generator.",
    h1: "Social Media Video Generator",
    subtitle:
      "Generate vertical short-form videos optimized for TikTok, Reels, Shorts, and paid social — from a single creative brief.",
    keywords: [
      "social media video generator",
      "TikTok video AI",
      "Instagram Reels generator",
      "YouTube Shorts AI",
      "vertical video marketing",
    ],
    ctaLabel: "Make social videos",
    ctaHref: "/signup",
    sections: [
      {
        heading: "Platform-ready formats",
        body:
          "Generate short vertical videos tailored for social discovery and paid placement, then export or publish directly from your workspace.",
      },
      {
        heading: "Fast iteration for trends",
        body:
          "Respond to trends and campaign moments quickly with AI-assisted generation and reusable Studio Pro templates.",
      },
      {
        heading: "Publish where your audience is",
        body:
          "Connect social accounts and publish to Instagram, TikTok, Facebook, and Reddit without juggling multiple tools.",
      },
    ],
  },
];

const pageBySlug = new Map(SEO_LANDING_PAGES.map((page) => [page.slug, page]));

export function getSeoLandingPage(slug: string) {
  return pageBySlug.get(slug) ?? null;
}

export function getAllSeoLandingSlugs() {
  return SEO_LANDING_PAGES.map((page) => page.slug);
}
