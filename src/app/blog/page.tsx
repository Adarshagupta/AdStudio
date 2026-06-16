import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { formatBlogDate, getPublishedBlogPosts } from "@/lib/blog";
import { buildBlogIndexJsonLd, buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Blog — AI UGC Ads, Video Marketing & Product Updates",
    description:
      "Guides, tips, and product updates for creating AI-powered UGC ads, short-form videos, and social content with LiteMoov.",
    path: "/blog",
    keywords: [
      "AI ad creation blog",
      "UGC marketing tips",
      "video marketing guides",
      "LiteMoov updates",
    ],
  }),
  alternates: {
    canonical: `${SITE_URL}/blog`,
    types: {
      "application/rss+xml": `${SITE_URL}/blog/feed.xml`,
    },
  },
};

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <>
      <JsonLd data={buildBlogIndexJsonLd()} />
      <PublicPageLayout
        title="Blog"
        description="Tips, product updates, and guides for creating better ads with AI."
      >
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/80 px-6 py-12 text-center">
              <p className="text-sm text-zinc-600 md:text-base">
                No posts published yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {post.coverImageUrl ? (
                    <div className="aspect-[16/9] overflow-hidden bg-zinc-100">
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-violet-100 via-sky-50 to-white" />
                  )}

                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      {post.publishedAt ? <span>{formatBlogDate(post.publishedAt)}</span> : null}
                      {post.authorName ? <span>· {post.authorName}</span> : null}
                    </div>

                    <h2 className="font-display text-xl font-semibold text-zinc-900 group-hover:text-violet-700">
                      {post.title}
                    </h2>

                    {post.excerpt ? (
                      <p className="line-clamp-3 text-sm leading-6 text-zinc-600">{post.excerpt}</p>
                    ) : null}

                    {post.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 4).map((tag) => (
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </PublicPageLayout>
    </>
  );
}
