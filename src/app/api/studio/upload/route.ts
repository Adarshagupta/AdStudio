import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { saveStudioAsset, validateStudioUploadFile, type StudioUploadKind } from "@/lib/studio-upload-server";
import { registerUserMediaAsset } from "@/lib/user-media-assets";

function parseUploadKind(value: unknown): StudioUploadKind | null {
  return value === "image" || value === "audio" || value === "video" ? value : null;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to upload studio assets." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const kind = parseUploadKind(formData.get("kind"));
  const fileEntry = formData.get("file");

  if (!kind || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: "Provide kind (image|audio|video) and a file." }, { status: 400 });
  }

  let contentType: string;
  try {
    contentType = validateStudioUploadFile(fileEntry, kind);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid file." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  try {
    const stored = await saveStudioAsset({
      userId: currentUser.user.id,
      workspaceId: currentUser.workspace.id,
      kind,
      buffer,
      contentType,
      originalName: fileEntry.name,
      request,
    });

    const asset = await registerUserMediaAsset({
      userId: currentUser.user.id,
      workspaceId: currentUser.workspace.id,
      kind,
      source: "UPLOADED",
      url: stored.url,
      name: fileEntry.name,
      mimeType: contentType,
      byteSize: stored.byteSize,
    });

    return NextResponse.json({
      url: asset?.url ?? stored.url,
      kind,
      storage: stored.storage,
      fileName: fileEntry.name,
      asset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed. Configure Cloudflare R2 for production or use local public/studio-assets in dev.",
      },
      { status: 500 },
    );
  }
}
