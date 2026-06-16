import "server-only";

import { prisma } from "@/lib/db";
import { formatBlogDate, parseBlogTags } from "@/lib/blog-utils";

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  tags: string[];
};

export { formatBlogDate };

export async function getPublishedBlogPosts(): Promise<BlogPostSummary[]> {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      authorName: true,
      publishedAt: true,
      tags: true,
    },
  });

  return posts.map((post) => ({
    ...post,
    tags: parseBlogTags(post.tags),
  }));
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
  });

  if (!post) return null;

  return {
    ...post,
    tags: parseBlogTags(post.tags),
  };
}
