import type { MetadataRoute } from "next";

import { getPublishedBlogPosts } from "@/lib/blog";
import { getAllSeoLandingSlugs } from "@/lib/seo-pages";
import { getStaticPageLastModified, PUBLIC_SITEMAP_ROUTES, SITE_OG_IMAGE, SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedBlogPosts().catch(() => []);

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified: getStaticPageLastModified(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    ...(route.path === "/" ? { images: [SITE_OG_IMAGE] } : {}),
  }));

  const featureEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/features`,
      lastModified: getStaticPageLastModified("/"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...getAllSeoLandingSlugs().map((slug) => ({
      url: `${SITE_URL}/features/${slug}`,
      lastModified: getStaticPageLastModified("/"),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.publishedAt ?? new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
    ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
  }));

  return [...staticEntries, ...featureEntries, ...blogEntries];
}
