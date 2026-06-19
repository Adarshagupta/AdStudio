"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

type EmailConfig = {
  provider: string;
  ready: boolean;
  missing: string[];
  warnings?: string[];
  from: string | { address: string; name?: string };
};

type EmailEventItem = {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
};

export function EmailSettingsPanel({
  config,
  events,
  members,
}: {
  config: EmailConfig;
  events: EmailEventItem[];
  members: MemberOption[];
}) {
  const [isCampaignSubmitting, setIsCampaignSubmitting] = useState(false);
  const [isReminderSubmitting, setIsReminderSubmitting] = useState(false);

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsCampaignSubmitting(true);

    const formData = new FormData(form);
    const scheduledValue = String(formData.get("scheduledAt") ?? "");

    try {
      const response = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          channel: formData.get("channel"),
          subject: formData.get("subject"),
          textBody: formData.get("textBody"),
          scheduledAt: scheduledValue ? new Date(scheduledValue).toISOString() : "",
        }),
      });
      const data = await readJsonResponse<{
        error?: string;
        delivery?: { sent?: number; skipped?: number };
      }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not send."));
      }

      notify.success(
        data.delivery
          ? `Sent to ${data.delivery.sent ?? 0}${(data.delivery.skipped ?? 0) > 0 ? `, ${data.delivery.skipped} skipped` : ""}.`
          : "Scheduled.",
      );
      if (form.isConnected) {
        form.reset();
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setIsCampaignSubmitting(false);
    }
  }

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsReminderSubmitting(true);

    const formData = new FormData(form);
    const sendAt = String(formData.get("sendAt") ?? "");
    const userId = String(formData.get("userId") ?? "");

    try {
      const response = await fetch("/api/email/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          message: formData.get("message"),
          sendAt: new Date(sendAt).toISOString(),
          userId: userId || null,
        }),
      });
      const data = await readJsonResponse<{
        error?: string;
        delivery?: { sent?: number };
      }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not schedule."));
      }

      notify.success(data.delivery ? `Sent to ${data.delivery.sent ?? 0}.` : "Scheduled.");
      if (form.isConnected) {
        form.reset();
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not schedule.");
    } finally {
      setIsReminderSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {!config.ready ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Email not configured. Missing: {config.missing.join(", ")}.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Provider {config.provider} · From {formatFrom(config.from)}
        </p>
      )}
      {config.warnings?.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {config.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <form className="space-y-3" onSubmit={createCampaign}>
            <p className="text-sm font-medium text-foreground">Campaign</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="campaign-name">
                <Input id="campaign-name" name="name" required />
              </Field>
              <Field label="Type" htmlFor="campaign-channel">
                <select id="campaign-channel" name="channel" className="studio-input h-10" defaultValue="MARKETING">
                  <option value="MARKETING">Marketing</option>
                  <option value="ADS">Ads</option>
                  <option value="REMINDER">Reminder</option>
                </select>
              </Field>
            </div>
            <Field label="Subject" htmlFor="campaign-subject">
              <Input id="campaign-subject" name="subject" required />
            </Field>
            <Field label="Body" htmlFor="campaign-text">
              <Textarea id="campaign-text" name="textBody" required className="min-h-24" />
            </Field>
            <Field label="Schedule (optional)" htmlFor="campaign-scheduled">
              <Input id="campaign-scheduled" name="scheduledAt" type="datetime-local" />
            </Field>
            <Button disabled={isCampaignSubmitting || !config.ready} size="sm">
              <Send className="h-4 w-4" />
              {isCampaignSubmitting ? "Sending…" : "Send"}
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <form className="space-y-3" onSubmit={createReminder}>
            <p className="text-sm font-medium text-foreground">Reminder</p>
            <Field label="Title" htmlFor="reminder-title">
              <Input id="reminder-title" name="title" required />
            </Field>
            <Field label="To" htmlFor="reminder-user">
              <select id="reminder-user" name="userId" className="studio-input h-10" defaultValue="">
                <option value="">Everyone</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Message" htmlFor="reminder-message">
              <Textarea id="reminder-message" name="message" required className="min-h-24" />
            </Field>
            <Field label="Send at" htmlFor="reminder-send-at">
              <Input id="reminder-send-at" name="sendAt" type="datetime-local" required />
            </Field>
            <Button className="w-full sm:w-auto" size="sm" disabled={isReminderSubmitting || !config.ready}>
              {isReminderSubmitting ? "Saving…" : "Schedule"}
            </Button>
          </form>
        </Card>
      </div>

      {events.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b px-3 py-2 text-sm font-medium text-foreground">Delivery log</div>
          <div className="divide-y">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{event.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.toEmail}</p>
                  {event.errorMessage ? (
                    <p className="text-xs text-red-600">{event.errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{event.status}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function formatFrom(value: EmailConfig["from"]) {
  return typeof value === "string" ? value : value.address;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
