import { NextResponse } from "next/server";

import { BLOG_SEED_POSTS } from "@/lib/blog-seed-data";
import { prisma } from "@/lib/db";

function verifyAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("admin_session=");
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = [];

    for (const seed of BLOG_SEED_POSTS) {
      const existing = await prisma.blogPost.findUnique({
        where: { slug: seed.slug },
      });

      if (!existing) {
        const created = await prisma.blogPost.create({
          data: {
            ...seed,
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
        results.push({ action: "created", slug: created.slug });
      } else {
        const updated = await prisma.blogPost.update({
          where: { slug: seed.slug },
          data: {
            title: seed.title,
            excerpt: seed.excerpt,
            content: seed.content,
            authorName: seed.authorName,
            tags: seed.tags,
            coverImageUrl: seed.coverImageUrl ?? null,
            status: "PUBLISHED",
            publishedAt: existing.publishedAt ?? new Date(),
          },
        });
        results.push({ action: "updated", slug: updated.slug });
      }
    }

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed blog posts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
