import "server-only";

import { getIntegrationRedirectUri } from "@/lib/integrations/app-url";
import type { SocialProviderId } from "@/lib/integrations/types";

export type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  scopes: string[];
};

export type OAuthProfile = {
  externalId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  profileMeta?: Record<string, unknown>;
};

type ProviderConfig = {
  configured: boolean;
  scopes: string[];
  buildAuthorizeUrl: (state: string) => string;
  exchangeCode: (code: string) => Promise<OAuthTokenResponse>;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
};

function getMetaCredentials() {
  return {
    appId: process.env.META_APP_ID?.trim(),
    appSecret: process.env.META_APP_SECRET?.trim(),
  };
}

function getTikTokCredentials() {
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY?.trim(),
    clientSecret: process.env.TIKTOK_CLIENT_SECRET?.trim(),
  };
}

function getRedditCredentials() {
  return {
    clientId: process.env.REDDIT_CLIENT_ID?.trim(),
    clientSecret: process.env.REDDIT_CLIENT_SECRET?.trim(),
  };
}

async function parseJsonResponse<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };

  if (!response.ok) {
    const message =
      (data as { error?: { message?: string } }).error?.message ||
      data.error ||
      data.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function createMetaProvider(provider: "facebook" | "instagram", scopes: string[]): ProviderConfig {
  const { appId, appSecret } = getMetaCredentials();
  const configured = Boolean(appId && appSecret);
  const redirectUri = getIntegrationRedirectUri(provider);

  return {
    configured,
    scopes,
    buildAuthorizeUrl(state) {
      const params = new URLSearchParams({
        client_id: appId ?? "",
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        scope: scopes.join(","),
      });

      return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    },
    async exchangeCode(code) {
      const params = new URLSearchParams({
        client_id: appId ?? "",
        client_secret: appSecret ?? "",
        redirect_uri: redirectUri,
        code,
      });

      const response = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`);
      const data = await parseJsonResponse<{ access_token: string; expires_in?: number }>(response);

      return {
        accessToken: data.access_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        scopes,
      };
    },
    async fetchProfile(accessToken) {
      if (provider === "instagram") {
        const accountsResponse = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`,
        );
        const accountsData = await parseJsonResponse<{
          data?: Array<{
            instagram_business_account?: {
              id?: string;
              username?: string;
              name?: string;
              profile_picture_url?: string;
            };
          }>;
        }>(accountsResponse);

        const instagramAccount = accountsData.data
          ?.map((page) => page.instagram_business_account)
          .find((account) => account?.id);

        if (instagramAccount?.id) {
          return {
            externalId: instagramAccount.id,
            username: instagramAccount.username ?? null,
            displayName: instagramAccount.name ?? instagramAccount.username ?? null,
            avatarUrl: instagramAccount.profile_picture_url ?? null,
            profileMeta: { provider: "instagram", source: "instagram_business_account" },
          };
        }
      }

      const profileResponse = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,picture&access_token=${accessToken}`,
      );
      const profile = await parseJsonResponse<{
        id: string;
        name?: string;
        picture?: { data?: { url?: string } };
      }>(profileResponse);

      return {
        externalId: profile.id,
        displayName: profile.name ?? null,
        avatarUrl: profile.picture?.data?.url ?? null,
        profileMeta: { provider },
      };
    },
  };
}

const PROVIDERS: Record<SocialProviderId, ProviderConfig> = {
  facebook: createMetaProvider("facebook", ["public_profile", "email", "pages_show_list"]),
  instagram: createMetaProvider("instagram", [
    "instagram_basic",
    "pages_show_list",
    "pages_read_engagement",
    "instagram_content_publish",
  ]),
  tiktok: {
    configured: Boolean(getTikTokCredentials().clientKey && getTikTokCredentials().clientSecret),
    scopes: ["user.info.basic", "video.list", "video.publish"],
    buildAuthorizeUrl(state) {
      const { clientKey } = getTikTokCredentials();
      const params = new URLSearchParams({
        client_key: clientKey ?? "",
        redirect_uri: getIntegrationRedirectUri("tiktok"),
        state,
        response_type: "code",
        scope: this.scopes.join(","),
      });

      return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    },
    async exchangeCode(code) {
      const { clientKey, clientSecret } = getTikTokCredentials();
      const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey ?? "",
          client_secret: clientSecret ?? "",
          code,
          grant_type: "authorization_code",
          redirect_uri: getIntegrationRedirectUri("tiktok"),
        }),
      });

      const data = await parseJsonResponse<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      }>(response);

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        scopes: data.scope?.split(",") ?? this.scopes,
      };
    },
    async fetchProfile(accessToken) {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await parseJsonResponse<{
        data?: {
          user?: {
            open_id?: string;
            username?: string;
            display_name?: string;
            avatar_url?: string;
          };
        };
      }>(response);

      const user = data.data?.user;

      return {
        externalId: user?.open_id ?? "unknown",
        username: user?.username ?? null,
        displayName: user?.display_name ?? user?.username ?? null,
        avatarUrl: user?.avatar_url ?? null,
        profileMeta: { provider: "tiktok" },
      };
    },
  },
  reddit: {
    configured: Boolean(getRedditCredentials().clientId && getRedditCredentials().clientSecret),
    scopes: ["identity", "read", "submit"],
    buildAuthorizeUrl(state) {
      const { clientId } = getRedditCredentials();
      const params = new URLSearchParams({
        client_id: clientId ?? "",
        response_type: "code",
        state,
        redirect_uri: getIntegrationRedirectUri("reddit"),
        duration: "permanent",
        scope: this.scopes.join(" "),
      });

      return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
    },
    async exchangeCode(code) {
      const { clientId, clientSecret } = getRedditCredentials();
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const response = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ugc-platform/1.0",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: getIntegrationRedirectUri("reddit"),
        }),
      });

      const data = await parseJsonResponse<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      }>(response);

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        scopes: data.scope?.split(" ") ?? this.scopes,
      };
    },
    async fetchProfile(accessToken) {
      const response = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ugc-platform/1.0",
        },
      });
      const profile = await parseJsonResponse<{
        id: string;
        name?: string;
        icon_img?: string;
      }>(response);

      return {
        externalId: profile.id,
        username: profile.name ?? null,
        displayName: profile.name ?? null,
        avatarUrl: profile.icon_img?.split("?")[0] ?? null,
        profileMeta: { provider: "reddit" },
      };
    },
  },
};

export function getProviderConfig(provider: SocialProviderId) {
  return PROVIDERS[provider];
}

export function isProviderConfigured(provider: SocialProviderId) {
  return PROVIDERS[provider].configured;
}

export function buildProviderAuthorizeUrl(provider: SocialProviderId, state: string) {
  return PROVIDERS[provider].buildAuthorizeUrl(state);
}

export async function exchangeProviderCode(provider: SocialProviderId, code: string) {
  const config = PROVIDERS[provider];
  const tokens = await config.exchangeCode(code);
  const profile = await config.fetchProfile(tokens.accessToken);

  return { tokens, profile };
}
