"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

export function ProfileSettingsForm({
  initialName,
  email,
  role,
}: {
  initialName: string | null;
  email: string;
  role: "ADMIN" | "MEMBER";
}) {
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readJsonResponse<{ name?: string; error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not update profile."));
      }

      notify.success("Profile updated.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-lg space-y-5 p-6">
      <form onSubmit={onSave} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
            Display name
          </label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Email</p>
          <p className="text-sm text-zinc-500">{email}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Workspace role</p>
          <p className="text-sm text-zinc-500">{role === "ADMIN" ? "Admin" : "Member"}</p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
