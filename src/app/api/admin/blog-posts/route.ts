import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { slugifyBlogTitle } from "@/lib/blog-utils";

function verifyAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("admin_session=");
}

function parseTagsInput(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string").slice(0, 12);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function normalizeSlug(raw: string, fallbackTitle: string) {
  const slug = slugifyBlogTitle(raw || fallbackTitle);
  if (!slug) {
    throw new Error("Could not generate a valid slug.");
  }
  return slug;
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const coverImageUrl =
      typeof body.coverImageUrl === "string" ? body.coverImageUrl.trim() || null : null;
    const authorName = typeof body.authorName === "string" ? body.authorName.trim() || null : null;
    const status = body.status === "PUBLISHED" || body.status === "ARCHIVED" ? body.status : "DRAFT";
    const tags = parseTagsInput(body.tags);

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const slug = normalizeSlug(typeof body.slug === "string" ? body.slug : "", title);

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A post with this slug already exists." }, { status: 409 });
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        coverImageUrl,
        authorName,
        status,
        tags,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create blog post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: string;
      coverImageUrl?: string | null;
      authorName?: string | null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      tags?: string[];
      publishedAt?: Date | null;
    } = {};

    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.excerpt === "string") data.excerpt = body.excerpt.trim();
    if (typeof body.content === "string") data.content = body.content.trim();
    if (typeof body.coverImageUrl === "string") {
      data.coverImageUrl = body.coverImageUrl.trim() || null;
    }
    if (typeof body.authorName === "string") {
      data.authorName = body.authorName.trim() || null;
    }
    if (body.tags !== undefined) {
      data.tags = parseTagsInput(body.tags);
    }

    if (typeof body.slug === "string" && body.slug.trim()) {
      data.slug = normalizeSlug(body.slug, data.title ?? existing.title);
      if (data.slug !== existing.slug) {
        const slugTaken = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
        if (slugTaken) {
          return NextResponse.json({ error: "A post with this slug already exists." }, { status: 409 });
        }
      }
    }

    if (body.status === "DRAFT" || body.status === "PUBLISHED" || body.status === "ARCHIVED") {
      data.status = body.status;
      if (body.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        data.publishedAt = new Date();
      }
      if (body.status === "DRAFT") {
        data.publishedAt = null;
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data,
    });

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update blog post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    await prisma.blogPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500 });
  }
}
