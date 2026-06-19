"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

import { AssetPicker } from "@/components/assets/AssetPicker";
import { AssetSourceDialog } from "@/components/assets/AssetSourceDialog";
import type { StudioUploadKind } from "@/lib/studio-upload-server";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";

const acceptByKind: Record<StudioUploadKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,audio/x-m4a",
  video: "video/mp4,video/webm,video/quicktime",
};

const kindLabels: Record<StudioUploadKind, string> = {
  image: "image",
  audio: "audio",
  video: "video",
};

function normalizeKinds(kinds: StudioUploadKind | StudioUploadKind[]) {
  const list = Array.isArray(kinds) ? kinds : [kinds];
  return list.length > 0 ? list : (["image"] as StudioUploadKind[]);
}

export function MediaUploadTrigger({
  kinds,
  onFile,
  onAsset,
  disabled = false,
  uploading = false,
  showLibrary = true,
  dialogTitle,
  dialogSubtitle,
  presentation = "modal",
  trigger,
  onTriggerClick,
}: {
  kinds: StudioUploadKind | StudioUploadKind[];
  onFile: (file: File) => void | Promise<void>;
  onAsset: (asset: UserMediaAssetDto) => void;
  disabled?: boolean;
  uploading?: boolean;
  showLibrary?: boolean;
  dialogTitle?: string;
  dialogSubtitle?: string;
  presentation?: "modal" | "fullscreen";
  trigger: (props: { open: () => void; disabled: boolean; uploading: boolean }) => ReactNode;
  onTriggerClick?: () => void;
}) {
  const kindList = useMemo(() => normalizeKinds(kinds), [kinds]);
  const primaryKind = kindList[0];
  const fileAccept = useMemo(() => kindList.map((k) => acceptByKind[k]).join(","), [kindList]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<StudioUploadKind>(primaryKind);

  const openFlow = () => {
    if (disabled || uploading) return;
    onTriggerClick?.();
    if (showLibrary) {
      setSourceOpen(true);
    } else {
      inputRef.current?.click();
    }
  };

  const title =
    dialogTitle ??
    (kindList.length === 1
      ? `Add ${kindLabels[primaryKind]}`
      : "Add media");
  const subtitle =
    dialogSubtitle ?? "Choose from your saved assets or upload from this device.";

  return (
    <>
      {trigger({ open: openFlow, disabled, uploading })}

      <input
        ref={inputRef}
        type="file"
        accept={fileAccept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      <AssetSourceDialog
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        title={title}
        subtitle={subtitle}
        showLibrary={showLibrary}
        presentation={presentation}
        onChooseLibrary={() => {
          setPickerKind(primaryKind);
          setPickerOpen(true);
        }}
        onChooseComputer={() => {
          inputRef.current?.click();
        }}
      />

      <AssetPicker
        kinds={kindList}
        kind={pickerKind}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onAsset}
        presentation={presentation}
      />
    </>
  );
}
