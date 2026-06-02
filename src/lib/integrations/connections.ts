import "server-only";

import type { Prisma } from "@prisma/client";

import { encryptSecret } from "@/lib/integrations/crypto";
import { isProviderConfigured } from "@/lib/integrations/providers";
import {
  fromPrismaSocialProvider,
  SOCIAL_PROVIDER_IDS,
  type IntegrationProviderStatus,
  type SocialConnectionSummary,
  type SocialProviderId,
  toPrismaSocialProvider,
} from "@/lib/integrations/types";
import { prisma } from "@/lib/db";

function toSummary(connection: {
  provider: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}): SocialConnectionSummary {
  return {
    provider: fromPrismaSocialProvider(connection.provider),
    username: connection.username,
    displayName: connection.displayName,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.createdAt.toISOString(),
    expiresAt: connection.expiresAt?.toISOString() ?? null,
  };
}

export async function listIntegrationStatuses(workspaceId: string): Promise<IntegrationProviderStatus[]> {
  const connections = await prisma.socialConnection.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  const connectionByProvider = new Map(
    connections.map((connection) => [fromPrismaSocialProvider(connection.provider), connection]),
  );

  return SOCIAL_PROVIDER_IDS.map((provider) => {
    const connection = connectionByProvider.get(provider) ?? null;

    return {
      provider,
      configured: isProviderConfigured(provider),
      connected: Boolean(connection),
      connection: connection ? toSummary(connection) : null,
    };
  });
}

export async function upsertSocialConnection(input: {
  workspaceId: string;
  provider: SocialProviderId;
  externalId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes: string[];
  profileMeta?: Record<string, unknown>;
}) {
  return prisma.socialConnection.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: input.workspaceId,
        provider: toPrismaSocialProvider(input.provider),
      },
    },
    create: {
      workspaceId: input.workspaceId,
      provider: toPrismaSocialProvider(input.provider),
      externalId: input.externalId,
      username: input.username ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      accessTokenEnc: encryptSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      expiresAt: input.expiresAt ?? null,
      scopes: input.scopes,
      profileMeta: (input.profileMeta ?? {}) as Prisma.InputJsonValue,
    },
    update: {
      externalId: input.externalId,
      username: input.username ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      accessTokenEnc: encryptSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      expiresAt: input.expiresAt ?? null,
      scopes: input.scopes,
      profileMeta: (input.profileMeta ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function disconnectSocialAccount(workspaceId: string, provider: SocialProviderId) {
  await prisma.socialConnection.deleteMany({
    where: {
      workspaceId,
      provider: toPrismaSocialProvider(provider),
    },
  });
}
