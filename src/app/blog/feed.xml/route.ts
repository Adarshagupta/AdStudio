import { getPublishedBlogPosts } from "@/lib/blog";
import { SITE_NAME } from "@/lib/site";
import { SITE_URL } from "@/lib/seo";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function enclosureTag(url: string, type = "image/jpeg") {
  return `<enclosure url="${escapeXml(url)}" type="${type}" />`;
}

export async function GET() {
  const posts = await getPublishedBlogPosts().catch(() => []);

  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/blog/${post.slug}`;
      const pubDate = post.publishedAt?.toUTCString() ?? new Date().toUTCString();
      const categories = post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("");
      const author = post.authorName ? `<author>${escapeXml(post.authorName)}</author>` : "";
      const enclosure = post.coverImageUrl ? enclosureTag(post.coverImageUrl) : "";

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(post.excerpt || post.title)}</description>
      <pubDate>${pubDate}</pubDate>${author}${categories}${enclosure}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${SITE_NAME} Blog`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escapeXml("Tips, updates, and guides for AI-powered ad creation.")}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
