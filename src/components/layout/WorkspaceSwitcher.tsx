"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { WorkspaceSwitchOverlay } from "@/components/layout/WorkspaceSwitchOverlay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { queueMembersNavHint } from "@/lib/members-nav-hint";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type WorkspaceOption = {
  id: string;
  name: string;
};

type InviteRow = {
  id: string;
  email: string;
};

function newInviteRow(): InviteRow {
  return { id: crypto.randomUUID(), email: "" };
}

function normalizeWorkspaceList(
  items: WorkspaceOption[] | undefined,
  fallback: WorkspaceOption,
): WorkspaceOption[] {
  if (!items?.length) {
    return [fallback];
  }

  const seen = new Set<string>();
  const merged: WorkspaceOption[] = [];

  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push({ id: item.id, name: item.name });
  }

  if (!seen.has(fallback.id)) {
    merged.unshift(fallback);
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export function WorkspaceSwitcher({
  activeWorkspaceId,
  activeWorkspaceName,
  initialWorkspaces = [],
  variant = "topbar",
  collapsed = false,
}: {
  activeWorkspaceId: string;
  activeWorkspaceName: string;
  initialWorkspaces?: WorkspaceOption[];
  variant?: "sidebar" | "topbar";
  collapsed?: boolean;
}) {
  const isSidebar = variant === "sidebar";
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>(() =>
    normalizeWorkspaceList(initialWorkspaces, {
      id: activeWorkspaceId,
      name: activeWorkspaceName,
    }),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([newInviteRow()]);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [switchSlow, setSwitchSlow] = useState(false);

  const initialWorkspaceKey = initialWorkspaces.map((item) => `${item.id}:${item.name}`).join("|");

  useEffect(() => {
    setWorkspaces(
      normalizeWorkspaceList(initialWorkspaces, {
        id: activeWorkspaceId,
        name: activeWorkspaceName,
      }),
    );
  }, [initialWorkspaceKey, activeWorkspaceId, activeWorkspaceName, initialWorkspaces]);

  const loadWorkspaces = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setListLoading(true);
      }

      const fallback = { id: activeWorkspaceId, name: activeWorkspaceName };

      try {
        const response = await fetch("/api/workspaces", { cache: "no-store" });
        const data = await readJsonResponse<{
          workspaces?: WorkspaceOption[];
        }>(response);

        if (!response.ok) return;

        if (data.workspaces?.length) {
          setWorkspaces(
            normalizeWorkspaceList(
              data.workspaces.map((item) => ({ id: item.id, name: item.name })),
              fallback,
            ),
          );
        }
      } catch {
        // Keep the current list.
      } finally {
        setListLoading(false);
      }
    },
    [activeWorkspaceId, activeWorkspaceName],
  );

  useEffect(() => {
    void loadWorkspaces({ silent: true });
  }, [loadWorkspaces]);

  function resetCreateForm() {
    setNewWorkspaceName("");
    setShowInvites(false);
    setInvites([newInviteRow()]);
  }

  async function onSwitch(workspaceId: string) {
    if (workspaceId === activeWorkspaceId || busyId || switchingTo) return;

    const target = workspaces.find((workspace) => workspace.id === workspaceId);
    setBusyId(workspaceId);
    setSwitchingTo(target?.name ?? activeWorkspaceName);
    setSwitchSlow(false);
    setMenuOpen(false);

    const slowTimer = window.setTimeout(() => setSwitchSlow(true), 3500);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
        signal: controller.signal,
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not switch workspace."));
      }

      // Full reload so the session cookie + server shell pick up the new workspace immediately.
      window.location.assign("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Workspace switch timed out. Try again."
          : err instanceof Error
            ? err.message
            : "Could not switch workspace.";
      notify.error(message);
      setBusyId(null);
      setSwitchingTo(null);
      setSwitchSlow(false);
    } finally {
      window.clearTimeout(timeout);
      window.clearTimeout(slowTimer);
    }
  }

  // Clear overlay if the active workspace updated without a full navigation (soft refresh).
  useEffect(() => {
    if (switchingTo && busyId && activeWorkspaceId === busyId) {
      setSwitchingTo(null);
      setBusyId(null);
      setSwitchSlow(false);
    }
  }, [activeWorkspaceId, busyId, switchingTo]);

  async function sendInvites() {
    const pendingInvites = invites
      .map((row) => row.email.trim())
      .filter((email) => email.length > 0)
      .map((email) => ({ email, preset: "creator" as const }));

    if (pendingInvites.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const response = await fetch("/api/onboarding/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invites: pendingInvites }),
    });
    const data = await readJsonResponse<{
      error?: string;
      sent?: { email: string; emailError?: string | null }[];
    }>(response);

    if (!response.ok) {
      throw new Error(responseErrorMessage(response, data, "Could not send invites."));
    }

    const emailFailures = data.sent?.filter((item) => item.emailError) ?? [];
    return {
      sent: (data.sent?.length ?? 0) - emailFailures.length,
      failed: emailFailures.length,
    };
  }

  async function onCreateWorkspace(event: React.FormEvent) {
    event.preventDefault();

    const name = newWorkspaceName.trim();
    if (!name || isCreating) return;

    setIsCreating(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readJsonResponse<{ error?: string; workspace?: WorkspaceOption }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not create workspace."));
      }

      const hasInviteEmails = invites.some((row) => row.email.trim().length > 0);

      if (hasInviteEmails) {
        const result = await sendInvites();
        if (result.sent > 0) {
          notify.success(`Workspace created. ${result.sent} invite(s) sent.`);
        } else if (result.failed > 0) {
          notify.info("Workspace created. Some invite emails could not be sent — use Members to resend.");
        }
      } else {
        queueMembersNavHint();
        notify.success(`Created ${data.workspace?.name ?? "workspace"}`);
      }

      setCreateOpen(false);
      resetCreateForm();
      void loadWorkspaces({ silent: true });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not create workspace.");
    } finally {
      setIsCreating(false);
    }
  }

  const showListLoading = listLoading && workspaces.length <= 1;

  return (
    <>
      <AnimatePresence>
        {switchingTo ? (
          <WorkspaceSwitchOverlay workspaceName={switchingTo} slow={switchSlow} />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          isSidebar && "shrink-0 border-b border-zinc-100",
          isSidebar && (collapsed ? "flex justify-center px-1 py-2" : "px-3 py-3"),
        )}
      >
        <DropdownMenu
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (open) {
              void loadWorkspaces();
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              title={isSidebar && collapsed ? activeWorkspaceName : undefined}
              aria-label={isSidebar && collapsed ? `Workspace: ${activeWorkspaceName}` : undefined}
              className={cn(
                isSidebar && collapsed
                  ? "h-9 w-9 rounded-lg p-0 hover:bg-zinc-100"
                  : isSidebar
                    ? "h-auto w-full justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-zinc-100"
                    : "hidden h-9 max-w-[200px] justify-between gap-2 px-3 sm:inline-flex",
              )}
            >
              {isSidebar && collapsed ? (
                <Layers className="h-4 w-4 shrink-0 text-zinc-600" />
              ) : isSidebar ? (
                <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <Layers className="h-4 w-4 shrink-0 text-zinc-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                    {activeWorkspaceName}
                  </span>
                </span>
              ) : (
                <span className="truncate text-sm text-zinc-600">{activeWorkspaceName}</span>
              )}
              {isSidebar && collapsed ? null : (
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isSidebar ? "start" : "end"}
            className={cn("w-56 rounded-2xl", isSidebar && !collapsed && "w-[calc(228px-1.5rem)]")}
          >
            {showListLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Loading workspaces…
              </div>
            ) : (
              workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  disabled={busyId === workspace.id || Boolean(switchingTo)}
                  onClick={() => onSwitch(workspace.id)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {busyId === workspace.id ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-500" />
                    ) : null}
                    <span className="truncate">{workspace.name}</span>
                  </span>
                  {workspace.id === activeWorkspaceId ? <Check className="h-4 w-4 shrink-0" /> : null}
                </DropdownMenuItem>
              ))
            )}
            {listLoading && !showListLoading ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing…
              </div>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={Boolean(switchingTo)}
              onSelect={(event) => {
                event.preventDefault();
                setMenuOpen(false);
                setCreateOpen(true);
              }}
              className="gap-2 text-zinc-700"
            >
              <Plus className="h-4 w-4 shrink-0 text-zinc-600" />
              Create new workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-zinc-900">
              Create new workspace
            </DialogTitle>
            <DialogDescription>
              Set up a separate workspace for another brand or client.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onCreateWorkspace}>
            <div className="space-y-2">
              <label htmlFor="workspace-name" className="text-sm font-medium text-zinc-700">
                Workspace name
              </label>
              <Input
                id="workspace-name"
                value={newWorkspaceName}
                onChange={(event) => setNewWorkspaceName(event.target.value)}
                placeholder="Acme Marketing"
                autoFocus
                maxLength={80}
                disabled={isCreating}
              />
            </div>

            <div className="rounded-xl border border-zinc-200/80">
              <button
                type="button"
                onClick={() => setShowInvites((value) => !value)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-800"
              >
                <span>Add team members</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                    showInvites && "rotate-90",
                  )}
                />
              </button>

              {showInvites ? (
                <div className="space-y-3 border-t border-zinc-100 px-3 py-3">
                  <p className="text-xs text-zinc-500">
                    Optional — invite teammates by email. You can add more later from Members.
                  </p>
                  {invites.map((row, index) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={row.email}
                        onChange={(event) =>
                          setInvites((items) =>
                            items.map((item) =>
                              item.id === row.id ? { ...item, email: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="colleague@company.com"
                        disabled={isCreating}
                        className="h-9"
                      />
                      {invites.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          disabled={isCreating}
                          onClick={() =>
                            setInvites((items) => items.filter((item) => item.id !== row.id))
                          }
                          aria-label={`Remove member ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isCreating}
                    onClick={() => setInvites((items) => [...items, newInviteRow()])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add another email
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newWorkspaceName.trim() || isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create workspace"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
