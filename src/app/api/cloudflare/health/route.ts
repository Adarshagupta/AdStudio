import { NextResponse } from "next/server";

import { cloudflareModels } from "@/lib/cloudflare/models";
import { generateScript, getConfiguredCloudflareModels } from "@/lib/cloudflare-ai";
import { getConfiguredLtxApiKeyCount, getConfiguredLtxVideoModel } from "@/lib/ltx-ai";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  if (!process.env.FIREWORKS_API_KEY?.trim()) {
    checks.fireworks = {
      ok: false,
      detail: "FIREWORKS_API_KEY is required for text generation.",
    };
  } else {
    checks.fireworks = {
      ok: true,
      detail: `Fireworks text configured (${getConfiguredCloudflareModels().text}).`,
    };
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    checks.config = {
      ok: false,
      detail: "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for image/audio.",
    };
  } else {
    checks.config = { ok: true, detail: "Cloudflare Workers AI credentials are configured." };
  }

  const ltxKeyCount = getConfiguredLtxApiKeyCount();
  if (ltxKeyCount > 0) {
    checks.ltx = {
      ok: true,
      detail: `LTX video configured (${getConfiguredLtxVideoModel()}, ${ltxKeyCount} API key${ltxKeyCount === 1 ? "" : "s"} with fallback).`,
    };
  } else {
    checks.ltx = {
      ok: false,
      detail: "LTX_API_KEY is required for video generation.",
    };
  }

  try {
    const script = await generateScript({
      prompt: "Test brief for a vitamin C serum aimed at women aged 25-35 with a 20% launch discount.",
      format: "UGC",
    });
    checks.script = {
      ok: true,
      detail: `Text API OK (${script.slice(0, 60).replace(/\s+/g, " ")}...)`,
    };
  } catch (error) {
    checks.script = {
      ok: false,
      detail: error instanceof Error ? error.message : "Text API check failed.",
    };
  }

  const ok = checks.fireworks.ok && checks.config.ok && checks.ltx.ok && checks.script.ok;

  return NextResponse.json(
    {
      ok,
      checks,
      models: {
        ...getConfiguredCloudflareModels(),
        video: getConfiguredLtxVideoModel(),
      },
      catalog: cloudflareModels,
      ltxVideoConfigured: ltxKeyCount > 0,
      ltxApiKeyCount: ltxKeyCount,
      note: "Text uses Fireworks (Kimi). Image/audio use Cloudflare Workers AI. Video uses LTX.",
    },
    { status: ok ? 200 : 502 },
  );
}
