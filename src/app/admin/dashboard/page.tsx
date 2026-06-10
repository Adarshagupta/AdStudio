"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Image,
  Video,
  AudioWaveform,
  Plus,
  Trash2,
  LogOut,
  Edit2,
  Check,
  X,
  Users,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  category: string;
  isPremium: boolean;
  usesIncludedQuota: boolean;
  cost: number;
  description: string;
  isSystem: boolean;
  isActive: boolean;
}

interface UserEntry {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  memberships: {
    workspace: { id: string; name: string; slug: string; plan: string };
  }[];
}

interface WorkspaceEntry {
  id: string;
  name: string;
  slug: string;
  plan: string;
  creditsRemaining: number;
  videoMinutesUsed: number;
  imageCountUsed: number;
  premiumCreditsUsed: number;
  createdAt: string;
  members: {
    user: { id: string; email: string; name: string | null };
  }[];
  _count: { generations: number; members: number };
}

interface PlanEntry {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPricePerMonth: number | null;
  creditsLabel: string | null;
  limits: { videoMinutes: number; imageCount: number; teamMembers: number; storageGB: number };
  features: string[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [section, setSection] = useState<"models" | "users" | "workspaces" | "plans">("models");
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-violet-500" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => {
              document.cookie = "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              router.push("/admin/login");
            }}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Section nav */}
        <div className="mt-6 flex items-center gap-1 border-b border-zinc-800">
          {[
            { key: "models" as const, label: "Models", icon: Image },
            { key: "users" as const, label: "Users", icon: Users },
            { key: "workspaces" as const, label: "Workspaces", icon: Building2 },
            { key: "plans" as const, label: "Plans", icon: CreditCard },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
                section === key
                  ? "border-b-2 border-violet-500 text-violet-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="mt-6">
          {section === "models" && <ModelsSection onError={setError} />}
          {section === "users" && <UsersSection onError={setError} />}
          {section === "workspaces" && <WorkspacesSection onError={setError} />}
          {section === "plans" && <PlansSection onError={setError} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- Models Section ---------- */
function ModelsSection({ onError }: { onError: (msg: string) => void }) {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("image");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ModelEntry>>({});
  const [form, setForm] = useState({
    name: "",
    provider: "",
    category: "image",
    isPremium: false,
    usesIncludedQuota: true,
    cost: 1,
    description: "",
  });

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch("/api/admin/models");
      const data = await res.json();
      if (res.ok) {
        setModels(data.models);
      } else {
        onError(data.error || "Failed to load models");
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setModels([...models, data.model]);
        setForm({
          name: "",
          provider: "",
          category: "image",
          isPremium: false,
          usesIncludedQuota: true,
          cost: 1,
          description: "",
        });
      } else {
        onError(data.error || "Failed to add model");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  async function handleDeleteModel(id: string) {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      const res = await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setModels(models.filter((m) => m.id !== id));
      } else {
        onError(data.error || "Failed to delete model");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  async function handleUpdateModel(id: string) {
    onError("");
    try {
      const res = await fetch(`/api/admin/models?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setModels(models.map((m) => (m.id === id ? { ...m, ...data.model } : m)));
        setEditingId(null);
      } else {
        onError(data.error || "Failed to update model");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  function startEdit(model: ModelEntry) {
    setEditingId(model.id);
    setEditForm({
      isPremium: model.isPremium,
      usesIncludedQuota: model.usesIncludedQuota,
      cost: model.cost,
      isActive: model.isActive,
    });
  }

  const filteredModels = models.filter((m) => m.category === activeTab);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex items-center gap-2 border-b border-zinc-800">
          {["image", "video", "audio"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "border-b-2 border-violet-500 text-violet-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "image" && <Image className="h-4 w-4" />}
              {tab === "video" && <Video className="h-4 w-4" />}
              {tab === "audio" && <AudioWaveform className="h-4 w-4" />}
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading models...</p>
          ) : filteredModels.length === 0 ? (
            <p className="text-sm text-zinc-500">No {activeTab} models yet.</p>
          ) : (
            filteredModels.map((model) => (
              <div
                key={model.id}
                className={`rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 ${
                  !model.isActive ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{model.name}</span>
                      {model.isSystem && (
                        <span className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">System</span>
                      )}
                      {model.isPremium && (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">Premium</span>
                      )}
                      {!model.isActive && (
                        <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{model.provider}</p>
                    {model.description && <p className="text-xs text-zinc-500">{model.description}</p>}
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>
                        {model.usesIncludedQuota ? (
                          <span className="text-emerald-400">Uses included quota</span>
                        ) : (
                          <span className="text-amber-400">Premium credits</span>
                        )}
                      </span>
                      <span>•</span>
                      <span>Cost: {model.cost} credit</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === model.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateModel(model.id)}
                          className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(model)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!model.isSystem && (
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {editingId === model.id && (
                  <div className="mt-3 border-t border-zinc-800 pt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        id={`premium-${model.id}`}
                        type="checkbox"
                        checked={editForm.isPremium ?? model.isPremium}
                        onChange={(e) => setEditForm({ ...editForm, isPremium: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-violet-500"
                      />
                      <label htmlFor={`premium-${model.id}`} className="text-sm text-zinc-400">
                        Premium (costs credits)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={`quota-${model.id}`}
                        type="checkbox"
                        checked={editForm.usesIncludedQuota ?? model.usesIncludedQuota}
                        onChange={(e) => setEditForm({ ...editForm, usesIncludedQuota: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-violet-500"
                      />
                      <label htmlFor={`quota-${model.id}`} className="text-sm text-zinc-400">
                        Uses included plan quota
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={`active-${model.id}`}
                        type="checkbox"
                        checked={editForm.isActive ?? model.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-violet-500"
                      />
                      <label htmlFor={`active-${model.id}`} className="text-sm text-zinc-400">
                        Active
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500">Cost (credits)</label>
                      <input
                        type="number"
                        min={1}
                        value={editForm.cost ?? model.cost}
                        onChange={(e) => setEditForm({ ...editForm, cost: Number(e.target.value) })}
                        className="mt-1 block w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5 text-violet-500" />
          Add Model
        </h2>
        <form onSubmit={handleAddModel} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              placeholder="e.g., GPT-Image-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400">Provider ID</label>
            <input
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              placeholder="e.g., openai/gpt-image-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isPremium"
              type="checkbox"
              checked={form.isPremium}
              onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-violet-500"
            />
            <label htmlFor="isPremium" className="text-sm text-zinc-400">
              Premium (costs credits)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="usesIncludedQuota"
              type="checkbox"
              checked={form.usesIncludedQuota}
              onChange={(e) => setForm({ ...form, usesIncludedQuota: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-violet-500"
            />
            <label htmlFor="usesIncludedQuota" className="text-sm text-zinc-400">
              Uses included plan quota
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400">Cost (credits)</label>
            <input
              type="number"
              min={1}
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              placeholder="Optional description"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Add Model
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Users Section ---------- */
function UsersSection({ onError }: { onError: (msg: string) => void }) {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [page]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotal(data.total);
      } else {
        onError(data.error || "Failed to load users");
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map((u) => (u.id === id ? { ...u, isActive: data.user.isActive } : u)));
      } else {
        onError(data.error || "Failed to update user");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  async function updateUserName(id: string) {
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map((u) => (u.id === id ? { ...u, name: data.user.name } : u)));
        setEditingId(null);
      } else {
        onError(data.error || "Failed to update user");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>
        <span className="text-sm text-zinc-500">
          {total} total • Page {page} of {totalPages}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-zinc-500">No users found.</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{user.name || user.email}</span>
                    {!user.isActive && (
                      <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{user.email}</p>
                  <p className="text-xs text-zinc-500">
                    Joined {new Date(user.createdAt).toLocaleDateString()} •{" "}
                    {user.memberships.length} workspace
                    {user.memberships.length !== 1 ? "s" : ""}
                  </p>
                  {user.memberships.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.memberships.map((m) => (
                        <span
                          key={m.workspace.id}
                          className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                        >
                          {m.workspace.name} ({m.workspace.plan})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingId === user.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white outline-none focus:border-violet-500"
                      />
                      <button
                        onClick={() => updateUserName(user.id)}
                        className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(user.id);
                          setEditName(user.name || "");
                        }}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleUserActive(user.id, user.isActive)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          user.isActive
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-zinc-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Workspaces Section ---------- */
function WorkspacesSection({ onError }: { onError: (msg: string) => void }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editCredits, setEditCredits] = useState(0);

  const plans = ["FREE", "STARTER", "PRO", "BUSINESS"];

  useEffect(() => {
    fetchWorkspaces();
  }, [page]);

  async function fetchWorkspaces() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/workspaces?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setWorkspaces(data.workspaces);
        setTotal(data.total);
      } else {
        onError(data.error || "Failed to load workspaces");
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function updateWorkspace(id: string) {
    try {
      const res = await fetch(`/api/admin/workspaces?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: editPlan, creditsRemaining: editCredits }),
      });
      const data = await res.json();
      if (res.ok) {
        setWorkspaces(workspaces.map((w) => (w.id === id ? { ...w, ...data.workspace } : w)));
        setEditingId(null);
      } else {
        onError(data.error || "Failed to update workspace");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workspaces</h2>
        <span className="text-sm text-zinc-500">
          {total} total • Page {page} of {totalPages}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading workspaces...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-zinc-500">No workspaces found.</p>
        ) : (
          workspaces.map((workspace) => (
            <div key={workspace.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{workspace.name}</span>
                    <span className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">
                      {workspace.plan}
                    </span>
                    <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">
                      {workspace.creditsRemaining} credits
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{workspace.slug}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <span>{workspace._count.members} members</span>
                    <span>{workspace._count.generations} generations</span>
                    <span>{workspace.videoMinutesUsed}m video used</span>
                    <span>{workspace.imageCountUsed} images used</span>
                    <span>{workspace.premiumCreditsUsed} premium used</span>
                  </div>
                  {workspace.members.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {workspace.members.slice(0, 5).map((m) => (
                        <span key={m.user.id} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          {m.user.name || m.user.email}
                        </span>
                      ))}
                      {workspace.members.length > 5 && (
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          +{workspace.members.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingId === workspace.id ? (
                    <>
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white outline-none focus:border-violet-500"
                      >
                        {plans.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={editCredits}
                        onChange={(e) => setEditCredits(Number(e.target.value))}
                        className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white outline-none focus:border-violet-500"
                        placeholder="Credits"
                      />
                      <button
                        onClick={() => updateWorkspace(workspace.id)}
                        className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(workspace.id);
                        setEditPlan(workspace.plan);
                        setEditCredits(workspace.creditsRemaining);
                      }}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-zinc-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Plans Section ---------- */
function PlansSection({ onError }: { onError: (msg: string) => void }) {
  const [plans, setPlans] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans);
      } else {
        onError(data.error || "Failed to load plans");
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Subscription Plans</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading plans...</p>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                {plan.id === "PRO" && (
                  <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">
                    Most popular
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400">{plan.tagline}</p>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white">
                  {plan.monthlyPrice ? `$${plan.monthlyPrice}` : "Free"}
                </span>
                {plan.monthlyPrice && <span className="text-sm text-zinc-500">/mo</span>}
              </div>
              {plan.yearlyPricePerMonth && (
                <p className="text-xs text-zinc-500">
                  ${plan.yearlyPricePerMonth}/mo billed yearly
                </p>
              )}
              <div className="mt-3 rounded-lg bg-zinc-800/50 p-3">
                <p className="text-xs font-medium text-zinc-400">Included limits</p>
                <div className="mt-1 space-y-1 text-xs text-zinc-500">
                  <p>{plan.limits.videoMinutes === Infinity ? "∞" : plan.limits.videoMinutes}m video</p>
                  <p>{plan.limits.imageCount === Infinity ? "∞" : plan.limits.imageCount} images</p>
                  <p>{plan.limits.teamMembers} team members</p>
                  <p>{plan.limits.storageGB}GB storage</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-zinc-400">Features</p>
                <ul className="mt-1 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-500">
                      <span className="mt-0.5 text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  {plan.creditsLabel} credits included
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
