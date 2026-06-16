export type BlogSeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  authorName: string;
  tags: string[];
  coverImageUrl?: string;
  content: string;
};

export const BLOG_SEED_POSTS: BlogSeedPost[] = [
  {
    slug: "create-ugc-ads-with-ai",
    title: "How to Create UGC Ads with AI in Under 10 Minutes",
    excerpt:
      "Learn how marketing teams use LiteMoov to go from product URL to polished UGC-style video ads without a full production crew.",
    authorName: "LiteMoov Team",
    tags: ["UGC", "AI", "Video Ads"],
    coverImageUrl: "/marketing/product-ad-preview.png",
    content: `# Why UGC-style ads work

User-generated content feels authentic. Viewers trust real voices and natural delivery more than polished corporate spots.

With AI, you can capture that tone at scale — script, voice, image, and video in one workflow.

## Start with a clear prompt

Describe your audience, offer, and hook in plain language. Example: "30-second TikTok ad for a skincare serum targeting women 25–35."

## Add your product URL

Paste your product page link and LiteMoov will research brand, offer, and key selling points automatically.

## Let the agent handle production

The agent plans your ad, writes the script, generates a hero image, creates voiceover, and renders video — step by step.

## Tips for better results

- Keep hooks under 3 seconds
- Mention one clear benefit early
- Use vertical 9:16 for social platforms
- Iterate quickly with small prompt changes

**Ready to try it?** Open Dashboard Chat, add your product URL, and generate your first ad.`,
  },
  {
    slug: "studio-pro-workflow-guide",
    title: "Studio Pro: Build Repeatable Ad Workflows",
    excerpt:
      "Studio Pro's visual node editor lets teams design production pipelines once and reuse them for every campaign.",
    authorName: "LiteMoov Team",
    tags: ["Studio Pro", "Workflow", "Teams"],
    coverImageUrl: "/marketing/image-generation-spotlight.jpeg",
    content: `# What is Studio Pro?

Studio Pro is a node-based editor for complex creative pipelines. Connect script, image, audio, and video steps visually.

## When to use Studio Pro

- You run the same ad format every week
- Multiple teammates collaborate on one project
- You want fine-grained control over each generation step

## A simple starter flow

1. **Script node** — generate or paste your ad copy
2. **Image node** — create a product or lifestyle frame
3. **Audio node** — produce voiceover from script
4. **Video node** — render final output with references

## Collaborate in real time

Invite teammates into a flow. See live cursors, synced edits, and shared agent context.

## Publish templates

Turn proven flows into marketplace templates so your whole team starts from a winning setup.

**Pro tip:** Save your best-performing flows as templates before campaign season starts.`,
  },
  {
    slug: "product-url-research-for-better-ads",
    title: "Why Product URL Research Makes Better Ads",
    excerpt:
      "Feeding your product page into LiteMoov helps the AI write scripts that match your brand, offer, and audience.",
    authorName: "LiteMoov Team",
    tags: ["Product Research", "Copywriting", "Conversion"],
    coverImageUrl: "/marketing/product-ad-preview.png",
    content: `# Generic prompts produce generic ads

Without product context, AI has to guess your brand voice, price point, and unique value.

## What product research extracts

- Brand and product name
- Key features and benefits
- Target audience signals
- Offer or pricing language
- Suggested ad angles

## How it improves each step

**Script** — mentions real product details instead of placeholders.

**Image** — reflects your category and positioning.

**Video** — stays aligned with your offer and tone.

## Best practices

- Use your canonical product page URL
- Preview research in chat before generating
- Combine URL research with a specific creative direction in your prompt

## Example prompt

"Create a confident, premium 15-second ad highlighting the main benefit for busy professionals."

Pair that with your product URL and let research do the heavy lifting.

**Result:** faster iterations and ads that feel on-brand on the first pass.`,
  },
  {
    slug: "image-studio-quick-start",
    title: "Image Studio Quick Start: From Idea to Ad Creative",
    excerpt:
      "Use Image Studio to generate, edit, and export ad-ready visuals with an agent-assisted canvas.",
    authorName: "LiteMoov Team",
    tags: ["Image Studio", "Design", "Creatives"],
    coverImageUrl: "/marketing/image-generation-spotlight.jpeg",
    content: `# Meet Image Studio

Image Studio combines an AI agent, sandbox canvas, and design toolbar in one editor.

## Create from scratch

Open Image Studio, describe your visual, and generate directly on the artboard.

## Edit existing creatives

Send an image from your library or dashboard into Image Studio for quick refinements.

## Agent + design together

Ask the agent for variations while using the toolbar for text, shapes, and layout tweaks.

## Export for campaigns

Download high-resolution assets for paid social, landing pages, and video thumbnails.

## Recommended sizes

- **9:16** — Stories, Reels, TikTok
- **1:1** — Feed posts
- **16:9** — YouTube and display

Start with one strong visual, then reuse it across video and static formats for consistent branding.`,
  },
];
