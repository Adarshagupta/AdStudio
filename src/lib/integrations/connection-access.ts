import "server-only";

import { decryptSecret } from "@/lib/integrations/crypto";
import {
  fromPrismaSocialProvider,
  type SocialConnectionSummary,
  type SocialProviderId,
  toPrismaSocialProvider,
} from "@/lib/integrations/types";
import { prisma } from "@/lib/db";

export type SocialConnectionWithToken = SocialConnectionSummary & {
  externalId: string;
  accessToken: string;
  profileMeta: Record<string, unknown> | null;
};

export async function getSocialConnectionWithToken(
  workspaceId: string,
  provider: SocialProviderId,
): Promise<SocialConnectionWithToken | null> {
  const connection = await prisma.socialConnection.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider: toPrismaSocialProvider(provider),
      },
    },
  });

  if (!connection) return null;

  return {
    provider: fromPrismaSocialProvider(connection.provider),
    username: connection.username,
    displayName: connection.displayName,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.createdAt.toISOString(),
    expiresAt: connection.expiresAt?.toISOString() ?? null,
    externalId: connection.externalId,
    accessToken: decryptSecret(connection.accessTokenEnc),
    profileMeta:
      connection.profileMeta && typeof connection.profileMeta === "object" && !Array.isArray(connection.profileMeta)
        ? (connection.profileMeta as Record<string, unknown>)
        : null,
  };
}

export async function listConnectedSocialAccounts(workspaceId: string) {
  const connections = await prisma.socialConnection.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  return connections.map((connection) => ({
    provider: fromPrismaSocialProvider(connection.provider),
    username: connection.username,
    displayName: connection.displayName,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.createdAt.toISOString(),
    expiresAt: connection.expiresAt?.toISOString() ?? null,
    externalId: connection.externalId,
  }));
}
