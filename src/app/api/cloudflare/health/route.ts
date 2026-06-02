import { NextResponse } from "next/server";

import { cloudflareModels } from "@/lib/cloudflare/models";
import { generateScript, getConfiguredCloudflareModels } from "@/lib/cloudflare-ai";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    checks.config = {
      ok: false,
      detail: "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.",
    };
    return NextResponse.json({ ok: false, checks }, { status: 503 });
  }

  checks.config = { ok: true, detail: "Cloudflare Workers AI credentials are configured." };

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

  const ok = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      ok,
      checks,
      models: getConfiguredCloudflareModels(),
      catalog: cloudflareModels,
      note: "Generation runs through Cloudflare Workers AI / AI Gateway REST API.",
    },
    { status: ok ? 200 : 502 },
  );
}
