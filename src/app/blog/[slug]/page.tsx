import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BlogContent } from "@/components/blog/BlogContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { formatBlogDate, getPublishedBlogPostBySlug } from "@/lib/blog";
import { buildBlogPostJsonLd, buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return buildNotFoundMetadata();
  }

  return buildPageMetadata({
    title: post.title,
    description: post.excerpt || post.title,
    path: `/blog/${post.slug}`,
    ogType: "article",
    image: post.coverImageUrl ?? undefined,
    publishedTime: post.publishedAt?.toISOString(),
    modifiedTime: (post.updatedAt ?? post.publishedAt)?.toISOString(),
    authors: post.authorName ? [post.authorName] : undefined,
    tags: post.tags,
    keywords: post.tags,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={buildBlogPostJsonLd({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt || post.title,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          tags: post.tags,
        })}
      />
      <PublicPageLayout title={post.title} description={post.excerpt || undefined}>
        <article className="mx-auto max-w-3xl px-5 md:px-8">
          <Link
            href="/blog"
            className="inline-flex text-sm font-medium text-violet-700 transition hover:text-violet-900"
          >
            ← Back to blog
          </Link>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatBlogDate(post.publishedAt)}</time> : null}
              {post.authorName ? <span>· {post.authorName}</span> : null}
            </div>

            {post.coverImageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <img src={post.coverImageUrl} alt={post.title} className="w-full object-cover" />
              </div>
            ) : null}

            {post.excerpt ? (
              <p className="text-base leading-7 text-zinc-600 md:text-lg">{post.excerpt}</p>
            ) : null}

            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-8">
            <BlogContent content={post.content} />
          </div>
        </article>
      </PublicPageLayout>
    </>
  );
}
