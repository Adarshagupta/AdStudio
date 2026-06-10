import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

function verifyAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("admin_session=");
}

const SYSTEM_MODELS = [
  // Image models
  { name: "Stable Diffusion XL", provider: "@cf/stabilityai/stable-diffusion-xl-base-1.0", category: "image", isPremium: false, usesIncludedQuota: true, cost: 1, description: "Cloudflare Stable Diffusion XL", isSystem: true },
  { name: "DALL-E 3", provider: "openai/dall-e-3", category: "image", isPremium: true, usesIncludedQuota: false, cost: 1, description: "OpenAI DALL-E 3", isSystem: true },
  { name: "GPT-Image-1", provider: "openai/gpt-image-1", category: "image", isPremium: true, usesIncludedQuota: false, cost: 1, description: "OpenAI GPT image generation", isSystem: true },
  { name: "Flux Schnell", provider: "sylicaai/flux-schnell", category: "image", isPremium: false, usesIncludedQuota: true, cost: 1, description: "SylicaAI Flux Schnell", isSystem: true },
  // Audio models
  { name: "MeloTTS", provider: "@cf/myshell-ai/melotts", category: "audio", isPremium: false, usesIncludedQuota: true, cost: 1, description: "Cloudflare MeloTTS", isSystem: true },
  // Video models
  { name: "Sora 2", provider: "openai/sora-2", category: "video", isPremium: true, usesIncludedQuota: false, cost: 2, description: "OpenAI Sora 2 video generation", isSystem: true },
  { name: "Veo 3", provider: "google/veo-3", category: "video", isPremium: true, usesIncludedQuota: false, cost: 2, description: "Google Veo 3 video generation", isSystem: true },
  { name: "Seedance", provider: "bytedance/seedance", category: "video", isPremium: true, usesIncludedQuota: false, cost: 2, description: "ByteDance Seedance video generation", isSystem: true },
  { name: "Kling", provider: "kling-ai/kling", category: "video", isPremium: true, usesIncludedQuota: false, cost: 2, description: "Kling AI video generation", isSystem: true },
];

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = [];
    for (const model of SYSTEM_MODELS) {
      const existing = await prisma.model.findUnique({
        where: { provider: model.provider },
      });

      if (!existing) {
        const created = await prisma.model.create({ data: model });
        results.push({ action: "created", model: created });
      } else {
        const updated = await prisma.model.update({
          where: { provider: model.provider },
          data: {
            name: model.name,
            category: model.category,
            isPremium: model.isPremium,
            usesIncludedQuota: model.usesIncludedQuota,
            cost: model.cost,
            description: model.description,
            isSystem: model.isSystem,
            isActive: true,
          },
        });
        results.push({ action: "updated", model: updated });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ error: "Failed to seed models" }, { status: 500 });
  }
}
