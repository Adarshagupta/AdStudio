"use client";

import { useEffect, useState } from "react";
import { Check, Edit2, ExternalLink, Plus, Trash2, X } from "lucide-react";

import { slugifyBlogTitle } from "@/lib/blog-utils";

type BlogPostEntry = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  authorName: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags: string[] | unknown;
  publishedAt: string | null;
  updatedAt: string;
};

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  authorName: "",
  status: "DRAFT" as BlogPostEntry["status"],
  tags: "",
};

function tagsToString(tags: unknown) {
  if (Array.isArray(tags)) {
    return tags.filter((item): item is string => typeof item === "string").join(", ");
  }
  return "";
}

export function BlogSection({ onError }: { onError: (msg: string) => void }) {
  const [posts, setPosts] = useState<BlogPostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    void fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/admin/blog-posts");
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts);
      } else {
        onError(data.error || "Failed to load blog posts");
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedPosts() {
    onError("");
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-blogs", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchPosts();
      } else {
        onError(data.error || "Failed to seed blog posts");
      }
    } catch {
      onError("Something went wrong");
    } finally {
      setSeeding(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    onError("");

    try {
      const res = await fetch("/api/admin/blog-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug: form.slug || slugifyBlogTitle(form.title),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts([data.post, ...posts]);
        setForm(emptyForm);
        setSlugTouched(false);
      } else {
        onError(data.error || "Failed to create post");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  async function handleUpdate(id: string) {
    onError("");
    try {
      const res = await fetch(`/api/admin/blog-posts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          slug: editForm.slug || slugifyBlogTitle(editForm.title),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(posts.map((post) => (post.id === id ? data.post : post)));
        setEditingId(null);
      } else {
        onError(data.error || "Failed to update post");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this blog post?")) return;
    onError("");

    try {
      const res = await fetch(`/api/admin/blog-posts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setPosts(posts.filter((post) => post.id !== id));
      } else {
        onError(data.error || "Failed to delete post");
      }
    } catch {
      onError("Something went wrong");
    }
  }

  function startEdit(post: BlogPostEntry) {
    setEditingId(post.id);
    setEditForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? "",
      authorName: post.authorName ?? "",
      status: post.status,
      tags: tagsToString(post.tags),
    });
  }

  function renderFormFields(
    values: typeof emptyForm,
    onChange: (next: typeof emptyForm) => void,
    options?: { autoSlug?: boolean; onSlugTouched?: () => void },
  ) {
    return (
      <div className="space-y-3">
        <input
          value={values.title}
          onChange={(event) => {
            const title = event.target.value;
            onChange({
              ...values,
              title,
              slug: options?.autoSlug && !slugTouched ? slugifyBlogTitle(title) : values.slug,
            });
          }}
          placeholder="Title"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <input
          value={values.slug}
          onChange={(event) => {
            options?.onSlugTouched?.();
            onChange({ ...values, slug: event.target.value });
          }}
          placeholder="slug-for-url"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <input
          value={values.authorName}
          onChange={(event) => onChange({ ...values, authorName: event.target.value })}
          placeholder="Author name"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <input
          value={values.coverImageUrl}
          onChange={(event) => onChange({ ...values, coverImageUrl: event.target.value })}
          placeholder="Cover image URL"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <textarea
          value={values.excerpt}
          onChange={(event) => onChange({ ...values, excerpt: event.target.value })}
          placeholder="Short excerpt for cards and SEO"
          rows={2}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <textarea
          value={values.content}
          onChange={(event) => onChange({ ...values, content: event.target.value })}
          placeholder="Post content (supports # headings, - lists, **bold**)"
          rows={8}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <input
          value={values.tags}
          onChange={(event) => onChange({ ...values, tags: event.target.value })}
          placeholder="Tags (comma separated)"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <select
          value={values.status}
          onChange={(event) =>
            onChange({ ...values, status: event.target.value as BlogPostEntry["status"] })
          }
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5 text-violet-400" />
          New post
        </h2>
        <form onSubmit={handleCreate} className="mt-4">
          {renderFormFields(form, setForm, {
            autoSlug: true,
            onSlugTouched: () => setSlugTouched(true),
          })}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Create post
          </button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Blog posts</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSeedPosts()}
              disabled={seeding}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {seeding ? "Seeding…" : "Seed sample posts"}
            </button>
            <a
              href="/blog"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
            >
              View public blog
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading posts...</p>
        ) : posts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-6 text-center">
            <p className="text-sm text-zinc-500">No posts yet.</p>
            <button
              type="button"
              onClick={() => void handleSeedPosts()}
              disabled={seeding}
              className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {seeding ? "Seeding…" : "Seed 4 sample posts"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                {editingId === post.id ? (
                  <div>
                    {renderFormFields(editForm, setEditForm)}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleUpdate(post.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium text-white">{post.title}</h3>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            post.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : post.status === "ARCHIVED"
                                ? "bg-zinc-700 text-zinc-300"
                                : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">/{post.slug}</p>
                      {post.excerpt ? (
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{post.excerpt}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {post.status === "PUBLISHED" ? (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                      <button
                        onClick={() => startEdit(post)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
