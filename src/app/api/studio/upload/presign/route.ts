import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { createR2PresignedPut, isR2Configured, studioUploadUsesR2 } from "@/lib/r2";
import {
  buildStudioFileName,
  buildUserAssetObjectKey,
  maxBytesForKind,
  validateStudioUploadFile,
  type StudioUploadKind,
} from "@/lib/studio-upload-server";

const presignSchema = z.object({
  kind: z.enum(["image", "audio", "video"]),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to upload studio assets." }, { status: 403 });
  }

  if (!studioUploadUsesR2()) {
    return NextResponse.json({ error: "Direct R2 upload is not enabled for this environment." }, { status: 400 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL.",
      },
      { status: 503 },
    );
  }

  const body = await parseRequestJson(request);
  const parsed = presignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { kind, fileName, contentType, size } = parsed.data;

  try {
    validateStudioUploadFile(
      { name: fileName, type: contentType, size },
      kind as StudioUploadKind,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid file." },
      { status: 400 },
    );
  }

  if (size > maxBytesForKind(kind)) {
    return NextResponse.json({ error: `File exceeds the ${kind} size limit.` }, { status: 400 });
  }

  const objectFileName = buildStudioFileName(contentType, fileName, kind);
  const key = buildUserAssetObjectKey(currentUser.user.id, kind, objectFileName);

  try {
    const presigned = await createR2PresignedPut({
      key,
      contentType,
      contentLength: size,
    });

    return NextResponse.json(presigned);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create upload URL." },
      { status: 500 },
    );
  }
}
