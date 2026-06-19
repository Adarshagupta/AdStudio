import type { Metadata } from "next";

import { subscriptionPlans } from "@/lib/billing/plans";
import { MARKETING_PRODUCT_AD } from "@/lib/marketing-assets";
import { PRODUCTION_APP_URL, SITE_DOMAIN, SITE_NAME } from "@/lib/site";

export const SITE_URL = PRODUCTION_APP_URL;
export const SITE_OG_IMAGE = `${SITE_URL}${MARKETING_PRODUCT_AD}`;

export const TWITTER_HANDLE = "@litemoov";

export const ORGANIZATION_SAME_AS = [
  "https://twitter.com/litemoov",
  "https://www.linkedin.com/company/litemoov",
] as const;

export const DEFAULT_KEYWORDS = [
  "AI UGC ads",
  "AI video generator",
  "UGC ad creator",
  "short-form video marketing",
  "AI ad creation",
  "text to video",
  "social media video generator",
  "marketing video AI",
  "Studio Pro video editor",
  "LiteMoov",
] as const;

export const LANDING_FAQ_ITEMS = [
  {
    question: "What is LiteMoov?",
    answer:
      "LiteMoov is an AI-powered platform for creating UGC ads, short-form marketing videos, and social-ready content. Teams use it to generate videos and images, build Studio Pro workflows, and publish to social channels from one workspace.",
  },
  {
    question: "How does AI video generation work on LiteMoov?",
    answer:
      "Describe your product, script, or creative direction and LiteMoov generates video, image, and audio assets using included plan quotas and premium AI models. You can refine outputs in Studio Pro with a visual node editor and collaborate with your team in real time.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. LiteMoov offers a free plan with included video minutes and image generations so you can test the platform. Paid plans add more quota, premium model credits, storage, team seats, and priority processing.",
  },
  {
    question: "What is Studio Pro?",
    answer:
      "Studio Pro is LiteMoov's visual workflow editor for building multi-step production pipelines — combining AI generation, editing, and publishing in a node-based canvas with live collaboration.",
  },
  {
    question: "Can I publish directly to social media?",
    answer:
      "Yes. LiteMoov supports social integrations so teams can connect accounts and publish content to platforms like Instagram, TikTok, Facebook, and Reddit from their workspace.",
  },
  {
    question: "Does LiteMoov offer a free trial on paid plans?",
    answer:
      "Pro and Starter plans include a free trial period. During the trial you can use included video and image quota; premium model credits unlock when your subscription becomes active.",
  },
] as const;

const PAID_PLANS = subscriptionPlans.filter((plan) => plan.monthlyPrice != null);

const STATIC_PAGE_LAST_MODIFIED: Record<string, string> = {
  "/": "2026-06-01T00:00:00.000Z",
  "/about": "2026-06-01T00:00:00.000Z",
  "/blog": "2026-06-10T00:00:00.000Z",
  "/contact": "2026-06-01T00:00:00.000Z",
  "/pricing": "2026-06-01T00:00:00.000Z",
  "/privacy": "2026-06-01T00:00:00.000Z",
  "/terms": "2026-06-01T00:00:00.000Z",
  "/cookies": "2026-06-01T00:00:00.000Z",
};

export function shouldIndexPublicPages() {
  if (process.env.NEXT_PUBLIC_NOINDEX === "true") return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  return true;
}

function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildRobotsDirective(index: boolean): NonNullable<Metadata["robots"]> {
  if (!index) {
    return { index: false, follow: false, googleBot: { index: false, follow: false } };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

function buildVerificationMetadata(): Metadata["verification"] | undefined {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  const yandex = process.env.YANDEX_SITE_VERIFICATION?.trim();
  const yahoo = process.env.YAHOO_SITE_VERIFICATION?.trim();

  if (!google && !bing && !yandex && !yahoo) return undefined;

  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    ...(yandex ? { yandex } : {}),
    ...(yahoo ? { yahoo } : {}),
  };
}

export function stripMarkdownForPlainText(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string) {
  const normalized = stripMarkdownForPlainText(text);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function buildOpenGraph(input: {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
}): NonNullable<Metadata["openGraph"]> {
  const imageUrl = input.image ?? SITE_OG_IMAGE;

  return {
    title: input.title,
    description: input.description,
    url: input.path ? absoluteUrl(input.path) : SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: input.type ?? "website",
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `${input.title} — ${SITE_NAME}`,
      },
    ],
    ...(input.type === "article"
      ? {
          publishedTime: input.publishedTime,
          modifiedTime: input.modifiedTime,
          authors: input.authors,
          tags: input.tags,
        }
      : {}),
  };
}

export function buildTwitterCard(input: {
  title: string;
  description: string;
  image?: string;
}): NonNullable<Metadata["twitter"]> {
  const imageUrl = input.image ?? SITE_OG_IMAGE;

  return {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: input.title,
    description: input.description,
    images: {
      url: imageUrl,
      alt: `${input.title} — ${SITE_NAME}`,
    },
  };
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogType?: "website" | "article";
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  noindex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(input.path);
  const indexable = shouldIndexPublicPages() && !input.noindex;

  return {
    title: { absolute: input.title },
    description: input.description,
    keywords: input.keywords ?? [...DEFAULT_KEYWORDS],
    alternates: { canonical },
    robots: buildRobotsDirective(indexable),
    openGraph: buildOpenGraph({
      title: input.title,
      description: input.description,
      path: input.path,
      type: input.ogType,
      image: input.image,
      publishedTime: input.publishedTime,
      modifiedTime: input.modifiedTime,
      authors: input.authors,
      tags: input.tags,
    }),
    twitter: buildTwitterCard({
      title: input.title,
      description: input.description,
      image: input.image,
    }),
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI UGC Ad & Video Generator for Marketing Teams`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Create AI-powered UGC ads, short-form videos, and social content in minutes. LiteMoov combines text-to-video generation, Studio Pro workflows, and team collaboration for modern marketing teams.",
  keywords: [...DEFAULT_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
    },
  },
  robots: buildRobotsDirective(shouldIndexPublicPages()),
  verification: buildVerificationMetadata(),
  openGraph: buildOpenGraph({
    title: `${SITE_NAME} — AI UGC Ad & Video Generator`,
    description:
      "Create AI-powered UGC ads, short-form videos, and social content in minutes with LiteMoov.",
    path: "/",
  }),
  twitter: buildTwitterCard({
    title: `${SITE_NAME} — AI UGC Ad & Video Generator`,
    description:
      "Create AI-powered UGC ads, short-form videos, and social content in minutes with LiteMoov.",
  }),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const noIndexMetadata: Metadata = {
  robots: buildRobotsDirective(false),
};

export function buildNotFoundMetadata(): Metadata {
  return {
    ...noIndexMetadata,
    title: { absolute: `Page not found | ${SITE_NAME}` },
    description: "The page you requested could not be found on LiteMoov.",
  };
}

export function buildHomeMetadata(): Metadata {
  return buildPageMetadata({
    title: `${SITE_NAME} — AI UGC Ad & Video Generator for Marketing Teams`,
    description:
      "Create AI-powered UGC ads, short-form videos, and social-ready content in minutes. Text-to-video generation, Studio Pro workflows, real-time collaboration, and flexible plans for marketing teams.",
    path: "/",
    keywords: [
      "AI UGC ad generator",
      "AI video generator for marketing",
      "UGC ad creator",
      "short-form video AI",
      "text to video marketing",
      "social media ad creator",
      ...DEFAULT_KEYWORDS,
    ],
  });
}

export function organizationSchema() {
  return {
    "@type": "Organization" as const,
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject" as const,
      url: `${SITE_URL}/icons/icon-512.png`,
      width: 512,
      height: 512,
    },
    email: "hello@litemoov.com",
    foundingDate: "2025",
    sameAs: [...ORGANIZATION_SAME_AS],
    contactPoint: [
      {
        "@type": "ContactPoint" as const,
        contactType: "customer support",
        email: "support@litemoov.com",
        availableLanguage: "English",
        areaServed: "Worldwide",
      },
      {
        "@type": "ContactPoint" as const,
        contactType: "sales",
        email: "sales@litemoov.com",
        availableLanguage: "English",
        areaServed: "Worldwide",
      },
    ],
  };
}

export function webSiteSchema() {
  return {
    "@type": "WebSite" as const,
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "AI-powered UGC ad and short-form video generation platform for marketing teams.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction" as const,
      target: {
        "@type": "EntryPoint" as const,
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function webApplicationSchema() {
  const prices = PAID_PLANS.map((plan) => plan.monthlyPrice as number);

  return {
    "@type": "WebApplication" as const,
    "@id": `${SITE_URL}/#application`,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript and a modern web browser.",
    description:
      "Create AI-powered UGC ads, marketing videos, and social content with text-to-video generation and Studio Pro workflows.",
    offers: {
      "@type": "AggregateOffer" as const,
      priceCurrency: "USD",
      lowPrice: Math.min(...prices).toString(),
      highPrice: Math.max(...prices).toString(),
      offerCount: PAID_PLANS.length.toString(),
      offers: PAID_PLANS.map((plan) => ({
        "@type": "Offer" as const,
        name: `${plan.name} Plan`,
        price: plan.monthlyPrice!.toString(),
        priceCurrency: "USD",
        url: `${SITE_URL}/pricing`,
        availability: "https://schema.org/InStock",
      })),
    },
    featureList: [
      "AI UGC ad generation",
      "Text-to-video creation",
      "Studio Pro visual workflows",
      "Team collaboration",
      "Social media publishing",
    ],
    provider: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqPageSchema(items: ReadonlyArray<{ question: string; answer: string }>, idSuffix = "faq") {
  return {
    "@type": "FAQPage" as const,
    "@id": `${SITE_URL}/#${idSuffix}`,
    mainEntity: items.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageSchema(input: {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
}) {
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${absoluteUrl(input.path)}#webpage`,
    url: absoluteUrl(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
  };
}

export function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      webSiteSchema(),
      webApplicationSchema(),
      faqPageSchema(LANDING_FAQ_ITEMS),
    ],
  };
}

export function buildAboutJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      webPageSchema({
        path: "/about",
        name: `About ${SITE_NAME}`,
        description:
          "Learn how LiteMoov helps marketing teams create AI-powered UGC ads and short-form videos.",
        type: "AboutPage",
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]),
    ],
  };
}

export function buildContactJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      webPageSchema({
        path: "/contact",
        name: `Contact ${SITE_NAME}`,
        description: "Contact LiteMoov for support, sales, partnerships, and legal inquiries.",
        type: "ContactPage",
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]),
    ],
  };
}

export function buildLegalJsonLd(input: { path: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      webPageSchema({
        path: input.path,
        name: input.name,
        description: input.description,
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: input.name, path: input.path },
      ]),
    ],
  };
}

export function buildPricingJsonLd() {
  const prices = PAID_PLANS.map((plan) => plan.monthlyPrice as number);

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      webPageSchema({
        path: "/pricing",
        name: `${SITE_NAME} Pricing`,
        description: "Flexible plans for AI video generation, UGC ads, and team collaboration.",
      }),
      {
        "@type": "Product" as const,
        "@id": `${SITE_URL}/pricing#product`,
        name: `${SITE_NAME} Subscription`,
        description: "AI video and UGC ad generation platform with flexible monthly plans.",
        brand: { "@id": `${SITE_URL}/#organization` },
        offers: {
          "@type": "AggregateOffer" as const,
          priceCurrency: "USD",
          lowPrice: Math.min(...prices).toString(),
          highPrice: Math.max(...prices).toString(),
          offerCount: PAID_PLANS.length.toString(),
          url: `${SITE_URL}/pricing`,
        },
      },
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Pricing", path: "/pricing" },
      ]),
    ],
  };
}

export function buildFeaturePageJsonLd(input: {
  slug: string;
  title: string;
  description: string;
  faq?: ReadonlyArray<{ question: string; answer: string }>;
}) {
  const path = `/features/${input.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      webPageSchema({
        path,
        name: input.title,
        description: input.description,
      }),
      {
        "@type": "SoftwareApplication" as const,
        "@id": `${absoluteUrl(path)}#software`,
        name: input.title,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        description: input.description,
        offers: {
          "@type": "Offer" as const,
          price: "0",
          priceCurrency: "USD",
          url: `${SITE_URL}/signup`,
        },
        provider: { "@id": `${SITE_URL}/#organization` },
      },
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Features", path: "/features" },
        { name: input.title, path },
      ]),
      ...(input.faq?.length ? [faqPageSchema(input.faq, `faq-${input.slug}`)] : []),
    ],
  };
}

export function buildBlogPostJsonLd(input: {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  tags?: string[];
}) {
  const url = `${SITE_URL}/blog/${input.slug}`;
  const published = input.publishedAt?.toISOString();
  const modified = (input.updatedAt ?? input.publishedAt)?.toISOString();
  const plainBody = input.content ? stripMarkdownForPlainText(input.content) : undefined;
  const wordCount = plainBody ? countWords(plainBody) : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: input.title,
        description: input.excerpt || input.title,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        datePublished: published,
        dateModified: modified,
        author: input.authorName
          ? { "@type": "Person", name: input.authorName }
          : { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        image: input.coverImageUrl ? [input.coverImageUrl] : [SITE_OG_IMAGE],
        inLanguage: "en-US",
        keywords: input.tags?.join(", "),
        wordCount,
        ...(plainBody ? { articleBody: plainBody.slice(0, 5000) } : {}),
        isPartOf: {
          "@type": "Blog",
          "@id": `${SITE_URL}/blog#blog`,
          name: `${SITE_NAME} Blog`,
          url: `${SITE_URL}/blog`,
        },
      },
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: input.title, path: `/blog/${input.slug}` },
      ]),
    ],
  };
}

export function buildBlogIndexJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      {
        "@type": "Blog",
        "@id": `${SITE_URL}/blog#blog`,
        name: `${SITE_NAME} Blog`,
        url: `${SITE_URL}/blog`,
        description: "Tips, updates, and guides for AI-powered ad creation.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
      ]),
    ],
  };
}

export function getStaticPageLastModified(path: string) {
  return new Date(STATIC_PAGE_LAST_MODIFIED[path] ?? STATIC_PAGE_LAST_MODIFIED["/"]);
}

export const PUBLIC_SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/pricing", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/blog", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly" as const, priority: 0.3 },
];

export const ROBOTS_DISALLOW_PATHS = [
  "/dashboard",
  "/api/",
  "/admin",
  "/settings",
  "/studio-pro/",
  "/generations",
  "/library",
  "/analytics",
  "/assets",
  "/create",
  "/onboarding",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password/",
  "/verify-email/",
  "/invite/",
  "/inspiration",
  "/billing/",
];

export { SITE_DOMAIN };
