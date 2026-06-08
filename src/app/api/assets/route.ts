import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { tryBootstrapDatabaseSchema } from "@/lib/db-bootstrap";
import { parseRequestJson } from "@/lib/http/json";
import { isPrismaSchemaMismatch } from "@/lib/user-db";
import {
  deleteUserMediaAsset,
  listUserMediaAssets,
  registerUserMediaAsset,
} from "@/lib/user-media-assets";
import type { StudioUploadKind } from "@/lib/studio-upload-server";

function parseKind(value: string | null): StudioUploadKind | undefined {
  if (value === "image" || value === "audio" || value === "video") return value;
  return undefined;
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to assets." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kind = parseKind(searchParams.get("kind"));
  const source = searchParams.get("source");
  const limit = Number.parseInt(searchParams.get("limit") ?? "48", 10);
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    const list = () =>
      listUserMediaAssets(currentUser.user.id, {
        kind,
        source: source === "uploaded" || source === "generated" ? source : undefined,
        limit: Number.isNaN(limit) ? 48 : limit,
        cursor,
      });

    try {
      return NextResponse.json(await list());
    } catch (error) {
      if (!isPrismaSchemaMismatch(error)) {
        throw error;
      }
      await tryBootstrapDatabaseSchema();
      return NextResponse.json(await list());
    }
  } catch (error) {
    console.error("[api/assets] GET failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load assets." },
      { status: 500 },
    );
  }
}

const registerSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["image", "audio", "video"]),
  source: z.enum(["uploaded", "generated"]).default("uploaded"),
  name: z.string().max(200).optional(),
  mimeType: z.string().max(120).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSec: z.number().int().positive().optional(),
  byteSize: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to assets." }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const asset = await registerUserMediaAsset({
      userId: currentUser.user.id,
      workspaceId: currentUser.workspace.id,
      kind: parsed.data.kind,
      source: parsed.data.source === "generated" ? "GENERATED" : "UPLOADED",
      url: parsed.data.url,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      width: parsed.data.width,
      height: parsed.data.height,
      durationSec: parsed.data.durationSec,
      byteSize: parsed.data.byteSize,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("[api/assets] POST failed:", error);
    const message = error instanceof Error ? error.message : "Could not save asset.";
    const status = message.includes("too long") || message.includes("embedded") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to assets." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Provide asset id." }, { status: 400 });
  }

  const removed = await deleteUserMediaAsset(currentUser.user.id, id);
  if (!removed) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
