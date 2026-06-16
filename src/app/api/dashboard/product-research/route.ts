import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { resolveProductContextForAgent } from "@/lib/product-research";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to create content." }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  const productUrl = typeof body?.productUrl === "string" ? body.productUrl.trim() : "";

  if (!productUrl) {
    return NextResponse.json({ error: "Product URL is required." }, { status: 400 });
  }

  const context = await resolveProductContextForAgent(productUrl);
  if (!context) {
    return NextResponse.json({ error: "Product research failed." }, { status: 502 });
  }

  const partial = context.includes("Note:");
  const summary = context.split("\n")[0] ?? "";
  const brandMatch = context.match(/^Brand: (.+)$/m);
  const productMatch = context.match(/^Product: (.+)$/m);

  return NextResponse.json({
    context,
    partial,
    research: {
      url: productUrl,
      summary,
      brandName: brandMatch?.[1],
      productName: productMatch?.[1],
    },
  });
}
