import type { MetadataRoute } from "next";

import { ROBOTS_DISALLOW_PATHS, SITE_DOMAIN, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ROBOTS_DISALLOW_PATHS,
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/blog", "/about", "/contact", "/pricing", "/features"],
        disallow: ROBOTS_DISALLOW_PATHS,
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/blog", "/about", "/contact", "/pricing", "/features"],
        disallow: ROBOTS_DISALLOW_PATHS,
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/blog", "/about", "/contact", "/pricing", "/features"],
        disallow: ROBOTS_DISALLOW_PATHS,
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/blog", "/about", "/contact", "/pricing", "/features"],
        disallow: ROBOTS_DISALLOW_PATHS,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ROBOTS_DISALLOW_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: `www.${SITE_DOMAIN}`,
  };
}
