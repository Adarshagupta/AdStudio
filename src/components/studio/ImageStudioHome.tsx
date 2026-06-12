"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ImagePlus,
  Layers,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const CANVAS_PRESETS = [
  { name: "Instagram Post", width: 1080, height: 1080, ratio: "1:1" },
  { name: "Story / Reel", width: 1080, height: 1920, ratio: "9:16" },
  { name: "YouTube Thumb", width: 1280, height: 720, ratio: "16:9" },
  { name: "Ad Banner", width: 1200, height: 628, ratio: "1.91:1" },
];

const FEATURES = [
  {
    icon: Wand2,
    title: "AI generate",
    description: "Create images with Flux, DALL-E, and Stable Diffusion.",
  },
  {
    icon: Layers,
    title: "Layer editing",
    description: "Stack, reorder, and blend layers like a pro editor.",
  },
  {
    icon: Sparkles,
    title: "AI tools",
    description: "Remove background, upscale, expand canvas, and replace objects.",
  },
];

function buildEditHref(params: { w?: number; h?: number; image?: string }) {
  const search = new URLSearchParams();
  if (params.w) search.set("w", String(params.w));
  if (params.h) search.set("h", String(params.h));
  if (params.image && !params.image.startsWith("data:")) {
    search.set("image", params.image);
  }
  const query = search.toString();
  return query ? `/studio/image/edit?${query}` : "/studio/image/edit";
}

export function ImageStudioHome() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEditor(params?: { w?: number; h?: number; image?: string }) {
    if (params?.image && typeof window !== "undefined") {
      sessionStorage.setItem("studio-image-url", params.image);
      router.push(buildEditHref({ w: params.w, h: params.h }));
      return;
    }
    router.push(buildEditHref(params ?? {}));
  }

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string | undefined;
      if (dataUrl) openEditor({ image: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-8 py-4 md:space-y-10 md:py-8">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-violet-50 px-4 py-1.5 text-xs font-medium text-violet-700">
            Image editing
          </div>
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-[2.75rem] md:leading-tight">
              Image Studio
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Edit, layer, and enhance ad creatives with AI — built for marketing teams.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload image
          </Button>
          <Button className="gap-2 bg-zinc-900" onClick={() => openEditor()}>
            <ImagePlus className="h-4 w-4" />
            New canvas
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <feature.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-zinc-900">{feature.title}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">Start with a preset</p>
            <p className="text-sm text-zinc-400">Common ad and social sizes</p>
          </div>
          <Link
            href="/studio/image/edit"
            className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:underline"
          >
            Open editor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => openEditor({ w: preset.width, h: preset.height })}
              className="group rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900 group-hover:text-violet-700">
                    {preset.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {preset.width} × {preset.height} · {preset.ratio}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  New
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-zinc-100/70 px-8 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <Sparkles className="h-6 w-6 text-violet-600" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-zinc-900">
          Edit from anywhere
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
          Click the edit icon on any image in your library, assets, or generations to open it
          here with one click.
        </p>
        <Button className="mt-6 gap-2 bg-zinc-900" onClick={() => openEditor()}>
          Open Image Studio
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
}
