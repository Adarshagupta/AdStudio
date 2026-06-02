"use client";

import { Loader2, Unplug } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { IntegrationProviderStatus } from "@/lib/integrations/types";
import { SOCIAL_PROVIDER_META } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

export function SocialConnectCard({
  status,
  busy,
  onConnect,
  onDisconnect,
}: {
  status: IntegrationProviderStatus;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const meta = SOCIAL_PROVIDER_META[status.provider];
  const accountLabel = status.connection?.username || status.connection?.displayName;

  return (
    <Card className="overflow-hidden bg-white p-0">
      <div className={cn("h-1.5 bg-gradient-to-r", meta.accentClass)} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-semibold",
                meta.accentClass,
                meta.iconClass,
              )}
            >
              {meta.label.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-zinc-900">{meta.label}</h3>
                {status.connected ? (
                  <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Connected</Badge>
                ) : status.configured ? (
                  <Badge variant="secondary" className="rounded-full">
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full">
                    Setup required
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p>
            </div>
          </div>
        </div>

        {status.connected && status.connection ? (
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-3">
            <Avatar className="h-10 w-10">
              {status.connection.avatarUrl ? (
                <AvatarImage src={status.connection.avatarUrl} alt={accountLabel ?? meta.label} />
              ) : null}
              <AvatarFallback className="bg-white text-xs text-zinc-700">
                {(accountLabel ?? meta.label).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {status.connection.displayName || accountLabel || "Connected account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {accountLabel ? `@${accountLabel.replace(/^@/, "")}` : "Account linked to this workspace"}
              </p>
            </div>
          </div>
        ) : null}

        {!status.configured ? (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Add the {meta.label} OAuth credentials to your environment before connecting.
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          {status.connected ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={onDisconnect}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
              Disconnect
            </Button>
          ) : (
            <Button size="sm" disabled={busy || !status.configured} onClick={onConnect}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect {meta.label}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
