"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SocialConnectCard } from "@/components/settings/SocialConnectCard";
import { Card } from "@/components/ui/card";
import type { IntegrationProviderStatus } from "@/lib/integrations/types";
import { SOCIAL_PROVIDER_META } from "@/lib/integrations/types";

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
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const refreshProviders = useCallback(async () => {
    const response = await fetch("/api/integrations");
    if (!response.ok) return;
    const data = (await response.json()) as { providers: IntegrationProviderStatus[] };
    setProviders(data.providers);
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const provider = searchParams.get("provider");
    const message = searchParams.get("message");

    if (connected) {
      const label = SOCIAL_PROVIDER_META[connected as keyof typeof SOCIAL_PROVIDER_META]?.label ?? connected;
      setBanner({ tone: "success", message: `${label} connected successfully.` });
      void refreshProviders();
    } else if (error) {
      const base = ERROR_MESSAGES[error] ?? "Something went wrong while connecting.";
      const providerLabel =
        provider && SOCIAL_PROVIDER_META[provider as keyof typeof SOCIAL_PROVIDER_META]
          ? SOCIAL_PROVIDER_META[provider as keyof typeof SOCIAL_PROVIDER_META].label
          : null;
      setBanner({
        tone: "error",
        message: providerLabel ? `${providerLabel}: ${message ?? base}` : message ?? base,
      });
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
    setBanner(null);

    try {
      const response = await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Disconnect failed.");
      }

      const label = SOCIAL_PROVIDER_META[provider as keyof typeof SOCIAL_PROVIDER_META]?.label ?? provider;
      setBanner({ tone: "success", message: `${label} disconnected.` });
      await refreshProviders();
    } catch {
      setBanner({ tone: "error", message: "Could not disconnect this account. Try again." });
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div className="space-y-6">
      {banner ? (
        <Card
          className={
            banner.tone === "success"
              ? "border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {banner.message}
        </Card>
      ) : null}

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
