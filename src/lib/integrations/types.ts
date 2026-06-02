export const SOCIAL_PROVIDER_IDS = ["instagram", "tiktok", "facebook", "reddit"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

export type SocialProviderMeta = {
  id: SocialProviderId;
  label: string;
  description: string;
  accentClass: string;
  iconClass: string;
};

export const SOCIAL_PROVIDER_META: Record<SocialProviderId, SocialProviderMeta> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    description: "Publish reels and posts to your Instagram business or creator account.",
    accentClass: "from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    iconClass: "text-white",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    description: "Share short-form videos to your TikTok profile.",
    accentClass: "from-zinc-900 to-zinc-700",
    iconClass: "text-white",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    description: "Post videos and updates to your Facebook pages.",
    accentClass: "from-[#1877f2] to-[#0d65d9]",
    iconClass: "text-white",
  },
  reddit: {
    id: "reddit",
    label: "Reddit",
    description: "Submit posts and videos to your Reddit account.",
    accentClass: "from-[#ff4500] to-[#ff5722]",
    iconClass: "text-white",
  },
};

export type SocialConnectionSummary = {
  provider: SocialProviderId;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  connectedAt: string;
  expiresAt: string | null;
};

export type IntegrationProviderStatus = {
  provider: SocialProviderId;
  configured: boolean;
  connected: boolean;
  connection: SocialConnectionSummary | null;
};

export function isSocialProviderId(value: string): value is SocialProviderId {
  return SOCIAL_PROVIDER_IDS.includes(value as SocialProviderId);
}

export function toPrismaSocialProvider(provider: SocialProviderId) {
  return provider.toUpperCase() as "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "REDDIT";
}

export function fromPrismaSocialProvider(provider: string): SocialProviderId {
  return provider.toLowerCase() as SocialProviderId;
}
