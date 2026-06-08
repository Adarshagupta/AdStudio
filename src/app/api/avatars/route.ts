import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { createPresignedUploadUrl } from "@/lib/r2";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";

const avatarSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("external_url"),
    name: z.string().min(2),
    previewUrl: z.string().url(),
  }),
  z.object({
    mode: z.literal("upload"),
    name: z.string().min(2),
    fileName: z.string().min(3),
    contentType: z.string().min(3).optional(),
  }),
]);

function contentTypeFromFileName(fileName: string) {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageBrandAssets")) {
    return NextResponse.json({ error: "You do not have access to manage brand assets." }, { status: 403 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = avatarSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (result.data.mode === "external_url") {
    const avatar = await prisma.avatar.create({
      data: {
        workspaceId: currentUser.workspace.id,
        name: result.data.name,
        previewUrl: result.data.previewUrl,
      },
    });

    return NextResponse.json({ avatar });
  }

  try {
    const key = `avatars/${currentUser.workspace.id}/${crypto.randomUUID()}-${result.data.fileName}`;
    const contentType = result.data.contentType?.trim() || contentTypeFromFileName(result.data.fileName);
    const upload = await createPresignedUploadUrl(key, contentType);
    const avatar = await prisma.avatar.create({
      data: {
        workspaceId: currentUser.workspace.id,
        name: result.data.name,
        previewUrl: upload.publicUrl,
      },
    });

    return NextResponse.json({ avatar, ...upload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar upload setup failed." },
      { status: 501 },
    );
  }
}
