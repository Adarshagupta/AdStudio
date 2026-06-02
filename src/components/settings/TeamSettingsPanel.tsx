"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, RefreshCw, Search, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  accessPresets,
  getAccessLabel,
  getAccessPresetId,
  getPresetById,
  normalizePermissions,
  permissionLabels,
  workspacePermissionKeys,
  type AccessPresetId,
  type WorkspacePermissions,
  type WorkspaceRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  createdAt: string | Date;
};

type Invite = {
  id: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  status: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  inviteUrl?: string;
};

type EditableMember = {
  id: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
};

export function TeamSettingsPanel({
  initialMembers,
  initialInvites,
  currentUserId,
}: {
  initialMembers: Member[];
  initialInvites: Invite[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<EditableMember | null>(null);
  const [invitePreset, setInvitePreset] = useState<AccessPresetId>("creator");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("MEMBER");
  const [invitePermissions, setInvitePermissions] = useState<WorkspacePermissions>(
    () => ({ ...accessPresets[1].permissions }),
  );
  const [recentInviteUrl, setRecentInviteUrl] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const name = member.name?.toLowerCase() ?? "";
      return name.includes(query) || member.email.toLowerCase().includes(query);
    });
  }, [members, search]);

  async function updateMemberAccess(
    memberId: string,
    role: WorkspaceRole,
    permissions: WorkspacePermissions,
  ) {
    setError(null);
    setNotice(null);
    setBusyAction(`member:${memberId}`);

    try {
      const response = await fetch(`/api/workspace/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions }),
      });
      const data = (await response.json()) as { member?: Member; error?: string };

      if (!response.ok || !data.member) {
        throw new Error(data.error ?? "Could not update member access.");
      }

      setMembers((items) => items.map((item) => (item.id === memberId ? data.member! : item)));
      setNotice("Saved.");
      setEditingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update member access.");
    } finally {
      setBusyAction(null);
    }
  }

  async function removeMember(memberId: string) {
    setError(null);
    setNotice(null);
    setBusyAction(`remove:${memberId}`);

    try {
      const response = await fetch(`/api/workspace/members/${memberId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not remove member.");
      }

      setMembers((items) => items.filter((item) => item.id !== memberId));
      setNotice("Removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setRecentInviteUrl(null);
    setBusyAction("invite:create");

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      role: inviteRole,
      permissions: invitePermissions,
    };

    try {
      const response = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { invite?: Invite; error?: string; emailError?: string | null };

      if (!response.ok || !data.invite) {
        throw new Error(data.error ?? "Could not create invite.");
      }

      setInvites((items) => [data.invite!, ...items.filter((item) => item.email !== data.invite!.email)]);
      setNotice(data.emailError ? `Invite created. Email failed: ${data.emailError}` : "Invite sent.");
      setRecentInviteUrl(data.invite.inviteUrl ?? null);
      setIsInviteOpen(false);

      if (data.invite.inviteUrl) {
        await copyToClipboard(data.invite.inviteUrl);
      }

      event.currentTarget.reset();
      selectInvitePreset("creator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invite.");
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshInvite(inviteId: string, copy = false) {
    setError(null);
    setNotice(null);
    setBusyAction(`invite:${inviteId}`);

    try {
      const response = await fetch(`/api/workspace/invites/${inviteId}`, {
        method: "PATCH",
      });
      const data = (await response.json()) as { invite?: Invite; error?: string; emailError?: string | null };

      if (!response.ok || !data.invite) {
        throw new Error(data.error ?? "Could not refresh invite.");
      }

      setInvites((items) => items.map((item) => (item.id === inviteId ? data.invite! : item)));
      setRecentInviteUrl(data.invite.inviteUrl ?? null);

      if (copy && data.invite.inviteUrl) {
        await copyToClipboard(data.invite.inviteUrl);
        setNotice(data.emailError ? "Link copied. Email failed." : "Link copied.");
      } else {
        setNotice(data.emailError ? "Refreshed. Email failed." : "Refreshed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh invite.");
    } finally {
      setBusyAction(null);
    }
  }

  async function revokeInvite(inviteId: string) {
    setError(null);
    setNotice(null);
    setBusyAction(`revoke:${inviteId}`);

    try {
      const response = await fetch(`/api/workspace/invites/${inviteId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not revoke invite.");
      }

      setInvites((items) => items.filter((item) => item.id !== inviteId));
      setNotice("Revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke invite.");
    } finally {
      setBusyAction(null);
    }
  }

  function applyPresetToMember(member: Member, presetId: AccessPresetId) {
    const preset = getPresetById(presetId);
    if (!preset) return;
    void updateMemberAccess(member.id, preset.role, normalizePermissions(preset.permissions, preset.role));
  }

  function selectInvitePreset(presetId: AccessPresetId) {
    const preset = getPresetById(presetId);
    if (!preset) return;

    setInvitePreset(preset.id);
    setInviteRole(preset.role);
    setInvitePermissions(normalizePermissions(preset.permissions, preset.role));
  }

  function toggleInvitePermission(key: keyof WorkspacePermissions) {
    if (inviteRole === "ADMIN") return;
    setInvitePreset("custom");
    setInvitePermissions((permissions) => ({ ...permissions, [key]: !permissions[key] }));
  }

  const adminCount = members.filter((member) => member.role === "ADMIN").length;

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden bg-white p-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-9 pl-9"
            />
          </div>
          <Button size="sm" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>

        <div className="divide-y">
          {filteredMembers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No members.</p>
          ) : (
            filteredMembers.map((member) => {
              const isSelf = member.id === currentUserId;
              const presetId = getAccessPresetId(member.role, member.permissions);
              const canRemoveAdmin = member.role !== "ADMIN" || adminCount > 1;
              const disabled = isSelf || busyAction?.includes(member.id);

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {member.name || member.email}
                      </p>
                      {isSelf ? <Badge variant="secondary">You</Badge> : null}
                    </div>
                    {member.name ? (
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={presetId}
                      disabled={disabled}
                      onChange={(event) => applyPresetToMember(member, event.target.value as AccessPresetId)}
                      className="h-9 min-w-[8rem] rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 disabled:opacity-50"
                      aria-label={`Access for ${member.email}`}
                    >
                      {accessPresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                      {presetId === "custom" ? <option value="custom">Custom</option> : null}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() =>
                        setEditingMember({
                          id: member.id,
                          name: member.name,
                          email: member.email,
                          role: member.role,
                          permissions: normalizePermissions(member.permissions, member.role),
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSelf || !canRemoveAdmin || busyAction === `remove:${member.id}`}
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {invites.length > 0 ? (
        <Card className="bg-white p-0">
          <div className="border-b px-3 py-2 text-sm font-medium text-zinc-900">Pending invites</div>
          <div className="divide-y">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-900">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {getAccessLabel(invite.role, invite.permissions)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyAction === `invite:${invite.id}`}
                    onClick={() => refreshInvite(invite.id, true)}
                  >
                    <Copy className="h-4 w-4" />
                    Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyAction === `invite:${invite.id}`}
                    onClick={() => refreshInvite(invite.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyAction === `revoke:${invite.id}`}
                    onClick={() => revokeInvite(invite.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {error ? <StatusMessage tone="error" message={error} /> : null}
      {notice ? <StatusMessage tone="success" message={notice} /> : null}
      {recentInviteUrl ? (
        <p className="truncate rounded-lg border bg-zinc-50 px-3 py-2 text-xs text-muted-foreground">
          {recentInviteUrl}
        </p>
      ) : null}

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createInvite}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email" htmlFor="invite-email">
                <Input id="invite-email" name="email" type="email" required autoComplete="email" />
              </Field>
              <Field label="Name" htmlFor="invite-name">
                <Input id="invite-name" name="name" autoComplete="name" />
              </Field>
            </div>

            <Field label="Access" htmlFor="invite-access">
              <select
                id="invite-access"
                value={invitePreset}
                onChange={(event) => selectInvitePreset(event.target.value as AccessPresetId)}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              >
                {accessPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
                {invitePreset === "custom" ? <option value="custom">Custom</option> : null}
              </select>
            </Field>

            {invitePreset === "custom" ? (
              <PermissionGrid
                role={inviteRole}
                permissions={invitePermissions}
                onToggle={toggleInvitePermission}
              />
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button disabled={busyAction === "invite:create"}>
                {busyAction === "invite:create" ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AccessDialog
        member={editingMember}
        busy={Boolean(editingMember && busyAction === `member:${editingMember.id}`)}
        onClose={() => setEditingMember(null)}
        onSave={(member) => updateMemberAccess(member.id, member.role, member.permissions)}
      />
    </div>
  );
}

function AccessDialog({
  member,
  busy,
  onClose,
  onSave,
}: {
  member: EditableMember | null;
  busy: boolean;
  onClose: () => void;
  onSave: (member: EditableMember) => void;
}) {
  const [draft, setDraft] = useState<EditableMember | null>(member);

  useEffect(() => {
    setDraft(member);
  }, [member]);

  const role = draft?.role ?? "MEMBER";
  const permissions = draft?.permissions ?? normalizePermissions(null, "MEMBER");
  const presetId = draft ? getAccessPresetId(draft.role, draft.permissions) : "creator";

  function setRole(roleValue: WorkspaceRole) {
    if (!draft) return;
    setDraft({
      ...draft,
      role: roleValue,
      permissions: normalizePermissions(draft.permissions, roleValue),
    });
  }

  function applyPreset(presetIdValue: AccessPresetId) {
    const preset = getPresetById(presetIdValue);
    if (!preset || !draft) return;
    setDraft({
      ...draft,
      role: preset.role,
      permissions: normalizePermissions(preset.permissions, preset.role),
    });
  }

  function togglePermission(key: keyof WorkspacePermissions) {
    if (!draft || draft.role === "ADMIN") return;
    setDraft({
      ...draft,
      permissions: { ...draft.permissions, [key]: !draft.permissions[key] },
    });
  }

  return (
    <Dialog
      open={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member?.email}</DialogTitle>
        </DialogHeader>

        {draft ? (
          <div className="space-y-4">
            <Field label="Role" htmlFor="member-role">
              <select
                id="member-role"
                value={role}
                onChange={(event) => setRole(event.target.value as WorkspaceRole)}
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>

            {role === "MEMBER" ? (
              <>
                <Field label="Preset" htmlFor="member-preset">
                  <select
                    id="member-preset"
                    value={presetId}
                    onChange={(event) => applyPreset(event.target.value as AccessPresetId)}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                  >
                    {accessPresets
                      .filter((preset) => preset.role === "MEMBER")
                      .map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    {presetId === "custom" ? <option value="custom">Custom</option> : null}
                  </select>
                </Field>
                <PermissionGrid role={role} permissions={permissions} onToggle={togglePermission} />
              </>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => onSave(draft)}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PermissionGrid({
  role,
  permissions,
  onToggle,
}: {
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  onToggle: (key: keyof WorkspacePermissions) => void;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {workspacePermissionKeys.map((key) => {
        const enabled = role === "ADMIN" || permissions[key];

        return (
          <button
            key={key}
            type="button"
            disabled={role === "ADMIN"}
            onClick={() => onToggle(key)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
              enabled ? "border-purple-200 bg-purple-50" : "border-zinc-200 hover:bg-zinc-50",
              role === "ADMIN" && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="text-zinc-900">{permissionLabels[key].label}</span>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                enabled ? "border-purple-600 bg-purple-600 text-white" : "border-zinc-300 bg-white",
              )}
            >
              {enabled ? <Check className="h-3 w-3" /> : null}
            </span>
          </button>
        );
      })}
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

function StatusMessage({ tone, message }: { tone: "error" | "success"; message: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-green-100 bg-green-50 text-green-700",
      )}
    >
      {message}
    </div>
  );
}

async function copyToClipboard(value: string) {
  if (!navigator.clipboard) return;
  await navigator.clipboard.writeText(value);
}
