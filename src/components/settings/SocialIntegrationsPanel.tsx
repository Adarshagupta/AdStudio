"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SocialConnectCard } from "@/components/settings/SocialConnectCard";
import { Card } from "@/components/ui/card";
import type { IntegrationProviderStatus } from "@/lib/integrations/types";
import { SOCIAL_PROVIDER_META } from "@/lib/integrations/types";
import { readJsonResponse } from "@/lib/http/json";
import { notify } from "@/lib/notify";

const ERROR_MESSAGES: Record<string, string> = {
  unknown_provider: "That social platform is not supported.",
  not_configured: "OAuth credentials are missing for this platform.",
  oauth_denied: "Authorization was cancelled or denied.",
  invalid_callback: "The OAuth callback was invalid or expired. Try again.",
  session_mismatch: "Your session changed during authorization. Sign in and try again.",
  connect_failed: "We could not finish connecting this account.",
};

export function SocialIntegrationsPanel({
  initialProviders,
}: {
  initialProviders: IntegrationProviderStatus[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState(initialProviders);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const refreshProviders = useCallback(async () => {
    const response = await fetch("/api/integrations");
    if (!response.ok) return;
    const data = await readJsonResponse<{ providers: IntegrationProviderStatus[] }>(response);
    setProviders(data.providers);
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");
    const message = searchParams.get("message");

    if (connected) {
      const label = SOCIAL_PROVIDER_META[connected as keyof typeof SOCIAL_PROVIDER_META]?.label ?? connected;
      notify.success(`${label} connected successfully.`);
      void refreshProviders();
    } else if (error) {
      const base = ERROR_MESSAGES[error] ?? "Something went wrong while connecting.";
      const providerLabel =
        provider && SOCIAL_PROVIDER_META[provider as keyof typeof SOCIAL_PROVIDER_META]
          ? SOCIAL_PROVIDER_META[provider as keyof typeof SOCIAL_PROVIDER_META].label
          : null;
      notify.error(providerLabel ? `${providerLabel}: ${message ?? base}` : message ?? base);
    }

    if (connected || error) {
      router.replace("/settings/integrations");
    }
  }, [refreshProviders, router, searchParams]);

  const configuredCount = useMemo(
    () => providers.filter((provider) => provider.connected).length,
    [providers],
  );

  async function handleConnect(provider: string) {
    setBusyProvider(provider);
    window.location.href = `/api/integrations/${provider}/connect`;
  }

  async function handleDisconnect(provider: string) {
    setBusyProvider(provider);
    try {
      const response = await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Disconnect failed.");
      }

      const label = SOCIAL_PROVIDER_META[provider as keyof typeof SOCIAL_PROVIDER_META]?.label ?? provider;
      notify.success(`${label} disconnected.`);
      await refreshProviders();
    } catch {
      notify.error("Could not disconnect this account. Try again.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white px-5 py-4">
        <p className="text-sm text-zinc-700">
          {configuredCount > 0
            ? `${configuredCount} account${configuredCount === 1 ? "" : "s"} connected to this workspace.`
            : "Connect your social accounts once, then publish from Studio Pro and the library."}
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {providers.map((status) => (
          <SocialConnectCard
            key={status.provider}
            status={status}
            busy={busyProvider === status.provider}
            onConnect={() => void handleConnect(status.provider)}
            onDisconnect={() => void handleDisconnect(status.provider)}
          />
        ))}
      </div>
    </div>
  );
}
