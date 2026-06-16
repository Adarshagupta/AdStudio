import { PrismaClient } from "@prisma/client";

import { BLOG_SEED_POSTS } from "../src/lib/blog-seed-data";

async function main() {
  const prisma = new PrismaClient();

  for (const seed of BLOG_SEED_POSTS) {
    const post = await prisma.blogPost.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        excerpt: seed.excerpt,
        content: seed.content,
        authorName: seed.authorName,
        tags: seed.tags,
        coverImageUrl: seed.coverImageUrl ?? null,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      create: {
        ...seed,
        coverImageUrl: seed.coverImageUrl ?? null,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    console.log(`Seeded: ${post.slug} (${post.content.length} chars)`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
