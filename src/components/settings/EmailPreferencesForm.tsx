"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type PreferenceState = {
  marketingEnabled: boolean;
  adsEnabled: boolean;
  remindersEnabled: boolean;
  productUpdatesEnabled: boolean;
};

const preferenceItems: Array<{
  key: keyof PreferenceState;
  label: string;
  description: string;
}> = [
  {
    key: "marketingEnabled",
    label: "Marketing",
    description: "Product education, launches, and customer stories.",
  },
  {
    key: "adsEnabled",
    label: "Ads",
    description: "Ad performance ideas, offers, and promotional campaigns.",
  },
  {
    key: "remindersEnabled",
    label: "Reminders",
    description: "Workspace reminders scheduled by your team.",
  },
  {
    key: "productUpdatesEnabled",
    label: "Product updates",
    description: "Feature changes and workflow improvements.",
  },
];

export function EmailPreferencesForm({ initialPreference }: { initialPreference: PreferenceState }) {
  const [preference, setPreference] = useState(initialPreference);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/email/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preference),
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not save preferences."));
      }

      notify.success("Email preferences saved.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-5 p-5">
      <div>
        <h2 className="text-sm font-medium text-foreground">Your email preferences</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Verification, password reset, and invite emails are always sent for account security.
        </p>
      </div>

      <div className="space-y-3">
        {preferenceItems.map((item) => {
          const enabled = preference[item.key];

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setPreference((value) => ({ ...value, [item.key]: !value[item.key] }))}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-purple-100",
                enabled ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/40" : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
                <span
                  className={cn(
                    "h-5 w-9 rounded-full p-0.5 transition",
                    enabled ? "bg-purple-600" : "bg-zinc-200",
                  )}
                >
                  <span
                    className={cn(
                      "block h-4 w-4 rounded-full bg-background transition",
                      enabled && "translate-x-4",
                    )}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Button disabled={isSaving} onClick={save}>
        {isSaving ? "Saving..." : "Save preferences"}
      </Button>
    </Card>
  );
}
