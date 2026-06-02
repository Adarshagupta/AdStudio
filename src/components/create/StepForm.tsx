"use client";

import { useState } from "react";

import { AvatarPicker } from "@/components/create/AvatarPicker";
import { ScriptEditor } from "@/components/create/ScriptEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { GenerationFormat } from "@prisma/client";
import { cn } from "@/lib/utils";

const captionStyles = ["Clean", "Karaoke", "Bold bars"];

export type GeneratePayload = {
  productDescription: string;
  productUrl: string;
  avatarId: string;
  scriptText: string;
  aspectRatio: string;
  captionStyle: string;
  musicEnabled: boolean;
  duration: number;
  resolution: string;
};

export function StepForm({
  format,
  isSubmitting,
  isGeneratingScript,
  onGenerate,
  onGenerateScript,
  avatars,
  initialPrompt = "",
}: {
  format: GenerationFormat;
  isSubmitting: boolean;
  isGeneratingScript: boolean;
  onGenerate: (payload: GeneratePayload) => Promise<void>;
  onGenerateScript: (payload: Pick<GeneratePayload, "productDescription" | "productUrl">) => Promise<string>;
  avatars: Array<{
    id: string;
    name: string;
    previewUrl: string;
    isSystem: boolean;
  }>;
  initialPrompt?: string;
}) {
  const [productDescription, setProductDescription] = useState(initialPrompt);
  const [productUrl, setProductUrl] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(avatars[0]?.id ?? null);
  const [scriptText, setScriptText] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [captionStyle, setCaptionStyle] = useState(captionStyles[0]);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [duration, setDuration] = useState(10);
  const [resolution, setResolution] = useState("480p");

  return (
    <div className="space-y-3">
      <Card className="space-y-4 bg-white">
        <StepHeader step="1" title="Product brief" description="Product, audience, offer, and proof points." />
        <Textarea
          value={productDescription}
          onChange={(event) => setProductDescription(event.target.value)}
          className="min-h-[140px]"
          placeholder="Describe the product, offer, audience, proof points, and tone."
        />
        <Input
          value={productUrl}
          onChange={(event) => setProductUrl(event.target.value)}
          placeholder="https://your-product-url.com (optional)"
        />
      </Card>

      <Card className="space-y-4 bg-white">
        <StepHeader step="2" title="Choose avatar" description="Pick the creator style for this cut." />
        <AvatarPicker avatars={avatars} selectedAvatarId={avatarId} onSelect={setAvatarId} />
      </Card>

      <Card className="space-y-4 bg-white">
        <StepHeader step="3" title="Script editor" description="Edit the generated script before rendering." />
        <div className="flex justify-end">
          <Button
            variant="secondary"
            disabled={isGeneratingScript || productDescription.trim().length < 10}
            onClick={async () => {
              try {
                const script = await onGenerateScript({ productDescription, productUrl });
                setScriptText(script);
              } catch {
                // Error state is owned by the parent preview panel.
              }
            }}
          >
            {isGeneratingScript ? "Generating script..." : "Generate script"}
          </Button>
        </div>
        <ScriptEditor value={scriptText} onChange={setScriptText} />
      </Card>

      <Card className="space-y-4 bg-white">
        <StepHeader step="4" title="Style options" description="Output size, captions, and sound." />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Aspect ratio</p>
            <Tabs value={aspectRatio} onValueChange={setAspectRatio}>
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="9:16">
                  9:16
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="1:1">
                  1:1
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="16:9">
                  16:9
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Caption style</p>
            <div className="flex flex-wrap gap-2">
              {captionStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setCaptionStyle(style)}
                  className={cn(
                    "h-10 rounded-md border bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-zinc-300 hover:bg-muted",
                    captionStyle === style && "border-purple-600 bg-purple-50 text-purple-900",
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <label className="flex h-10 items-center gap-2 self-end rounded-md border bg-white px-3 text-sm">
            <input
              type="checkbox"
              checked={musicEnabled}
              onChange={(event) => setMusicEnabled(event.target.checked)}
              className="h-4 w-4 accent-purple-600"
            />
            Music
          </label>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Duration</p>
            <Input
              type="number"
              min={1}
              max={15}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Resolution</p>
            <Tabs value={resolution} onValueChange={setResolution}>
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="480p">
                  480p
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="720p">
                  720p
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      <div className="flex justify-end rounded-lg border bg-white p-3">
        <Button
          disabled={isSubmitting || productDescription.trim().length < 10}
          onClick={() =>
            onGenerate({
              productDescription,
              productUrl,
              avatarId: avatarId ?? "",
              scriptText,
              aspectRatio,
              captionStyle,
              musicEnabled,
              duration,
              resolution,
            })
          }
        >
          {isSubmitting ? "Queueing..." : `Generate ${formatLabel(format)}`}
        </Button>
      </div>
    </div>
  );
}

function StepHeader({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-200 bg-purple-100 text-xs font-medium text-purple-950">
        {step}
      </div>
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function formatLabel(format: GenerationFormat) {
  if (format === "BRAIN_ROT") return "brain rot video";
  if (format === "STATIC") return "static ad";
  if (format === "REVIEW") return "review ad";
  return "UGC video";
}
