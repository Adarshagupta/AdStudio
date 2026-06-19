"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { consumeStudioImageUrl } from "@/lib/studio-image-transfer";
import { cn } from "@/lib/utils";
import { ImageStudioCanvas, ImageStudioCanvasRef } from "./ImageStudioCanvas";
import { ImageStudioLayersPanel } from "./ImageStudioLayersPanel";
import {
  ImageStudioAgentPanel,
  ImageStudioFloatingToolbar,
} from "./ImageStudioFloatingToolbar";
import { ImageStudioMiniHeader } from "./ImageStudioMiniHeader";
import type { Layer, StudioTool } from "./image-studio-types";

export type { Layer, StudioTool } from "./image-studio-types";

export interface WorkspaceState {
  tool: StudioTool;
  color: string;
  brushSize: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  layers: Layer[];
  activeLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  history: ImageData[];
  historyIndex: number;
  zoom: number;
  showAIPanel: boolean;
  showLayersPanel: boolean;
}

export function ImageStudioWorkspace({
  creditsRemaining,
  initialWidth,
  initialHeight,
}: {
  userId: string;
  workspaceId: string;
  creditsRemaining: number;
  initialWidth?: number;
  initialHeight?: number;
}) {
  const [tool, setTool] = useState<StudioTool>("select");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily] = useState("sans-serif");
  const [fontWeight] = useState("normal");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1024);
  const [canvasHeight, setCanvasHeight] = useState(576);
  const [zoom, setZoom] = useState(1);
  const [agentOpen, setAgentOpen] = useState(true);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [toolbarPrompt, setToolbarPrompt] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentMessages, setAgentMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; imageUrl?: string }>
  >([]);
  const canvasRef = useRef<ImageStudioCanvasRef>(null);
  const initializedRef = useRef(false);

  const addLayer = useCallback((name?: string, imageUrl?: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (imageUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = imageUrl;
      }
    }
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: name || `Layer ${layers.length + 1}`,
      visible: true,
      opacity: 1,
      locked: false,
      canvas,
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [canvasWidth, canvasHeight, layers.length]);

  const deleteLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      if (filtered.length === 0) {
        setActiveLayerId(null);
      } else if (activeLayerId === id) {
        setActiveLayerId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }, [activeLayerId]);

  const updateLayer = useCallback((id: string, updates: Partial<Omit<Layer, "canvas">>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  }, []);

  const reorderLayer = useCallback((id: string, direction: "up" | "down") => {
    setLayers((prev) => {
      const index = prev.findIndex((l) => l.id === id);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newLayers = [...prev];
      const [moved] = newLayers.splice(index, 1);
      newLayers.splice(newIndex, 0, moved);
      return newLayers;
    });
  }, []);

  const duplicateLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const layer = prev.find((l) => l.id === id);
      if (!layer) return prev;
      const newCanvas = document.createElement("canvas");
      newCanvas.width = layer.canvas.width;
      newCanvas.height = layer.canvas.height;
      const ctx = newCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(layer.canvas, 0, 0);
      }
      const newLayer: Layer = {
        ...layer,
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: `${layer.name} copy`,
        canvas: newCanvas,
      };
      const index = prev.findIndex((l) => l.id === id);
      const newLayers = [...prev];
      newLayers.splice(index + 1, 0, newLayer);
      setActiveLayerId(newLayer.id);
      return newLayers;
    });
  }, []);

  const mergeVisibleLayers = useCallback(() => {
    const visibleLayers = layers.filter((l) => l.visible);
    if (visibleLayers.length === 0) return;
    const mergedCanvas = document.createElement("canvas");
    mergedCanvas.width = canvasWidth;
    mergedCanvas.height = canvasHeight;
    const ctx = mergedCanvas.getContext("2d");
    if (!ctx) return;
    visibleLayers.forEach((layer) => {
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
    });
    ctx.globalAlpha = 1;
    const mergedLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: "Merged",
      visible: true,
      opacity: 1,
      locked: false,
      canvas: mergedCanvas,
    };
    setLayers([mergedLayer]);
    setActiveLayerId(mergedLayer.id);
  }, [layers, canvasWidth, canvasHeight]);

  const exportImage = useCallback((format: "png" | "jpeg" | "webp" = "png", quality = 1) => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    layers.forEach((layer) => {
      if (!layer.visible) return;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
    });
    ctx.globalAlpha = 1;
    const link = document.createElement("a");
    link.download = `studio-export.${format}`;
    link.href = exportCanvas.toDataURL(`image/${format}`, quality);
    link.click();
  }, [layers, canvasWidth, canvasHeight]);

  const handleNewCanvas = useCallback((width: number, height: number) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: "Background",
      visible: true,
      opacity: 1,
      locked: false,
      canvas,
    };
    setLayers([newLayer]);
    setActiveLayerId(newLayer.id);
  }, []);

  const loadImageFromUrl = useCallback((url: string, layerName = "Imported") => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setCanvasWidth(img.width);
      setCanvasHeight(img.height);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      const newLayer: Layer = {
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: layerName,
        visible: true,
        opacity: 1,
        locked: false,
        canvas,
      };
      setLayers([newLayer]);
      setActiveLayerId(newLayer.id);
    };
    img.onerror = () => {
      handleNewCanvas(initialWidth ?? 1024, initialHeight ?? 576);
    };
    img.src = url;
  }, [handleNewCanvas, initialHeight, initialWidth]);

  const applyAgentImage = useCallback(
    (url: string, layerName = "AI Generated") => {
      if (layers.length === 0) {
        loadImageFromUrl(url, layerName);
        return;
      }
      addLayer(layerName, url);
    },
    [addLayer, layers.length, loadImageFromUrl],
  );

  const runAgentPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      const userMessage = { id: `msg-${Date.now()}`, role: "user" as const, content: trimmed };
      setAgentMessages((prev) => [...prev, userMessage]);
      setToolbarPrompt("");
      setAgentBusy(true);

      try {
        const lower = trimmed.toLowerCase();

        if (lower.includes("remove") && lower.includes("background")) {
          const response = await fetch("/api/studio/image/edit/remove-background", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Background removal failed");
          if (data.imageUrl) applyAgentImage(data.imageUrl, "Background removed");
          setAgentMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-assistant`,
              role: "assistant",
              content: data.imageUrl
                ? "Background removed and applied to your canvas."
                : data.message || "Background removal request received.",
              imageUrl: data.imageUrl,
            },
          ]);
          return;
        }

        if (lower.includes("upscale") || lower.includes("sharpen")) {
          const response = await fetch("/api/studio/image/edit/upscale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scale: 2 }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Upscale failed");
          if (data.imageUrl) applyAgentImage(data.imageUrl, "Upscaled");
          setAgentMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-assistant`,
              role: "assistant",
              content: "Upscaled image applied to your canvas.",
              imageUrl: data.imageUrl,
            },
          ]);
          return;
        }

        if (lower.includes("expand") || lower.includes("9:16") || lower.includes("story")) {
          const response = await fetch("/api/studio/image/edit/expand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              width: lower.includes("9:16") || lower.includes("story") ? 1080 : 1200,
              height: lower.includes("9:16") || lower.includes("story") ? 1920 : 800,
              prompt: trimmed,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Expand failed");
          if (data.imageUrl) applyAgentImage(data.imageUrl, "Expanded");
          setAgentMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-assistant`,
              role: "assistant",
              content: "Expanded canvas applied to your design.",
              imageUrl: data.imageUrl,
            },
          ]);
          return;
        }

        const generatePrompt =
          trimmed.length >= 10 ? trimmed : `${trimmed}. Professional marketing ad creative, clean composition.`;

        const response = await fetch("/api/studio/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: generatePrompt,
            model: "self-hosted/flux-2-dev",
            aspectRatio: lower.includes("9:16") ? "9:16" : lower.includes("16:9") ? "16:9" : "1:1",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Image generation failed");

        applyAgentImage(data.imageUrl, "AI Generated");
        setAgentMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: "Generated a new creative and added it to your canvas.",
            imageUrl: data.imageUrl,
          },
        ]);
      } catch (error) {
        setAgentMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: error instanceof Error ? error.message : "Something went wrong.",
          },
        ]);
      } finally {
        setAgentBusy(false);
      }
    },
    [applyAgentImage],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const imageUrl = consumeStudioImageUrl();

    if (imageUrl) {
      loadImageFromUrl(imageUrl);
      return;
    }

    handleNewCanvas(initialWidth ?? 1024, initialHeight ?? 576);
  }, [handleNewCanvas, initialHeight, initialWidth, loadImageFromUrl]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-100">
      <ImageStudioCanvas
        ref={canvasRef}
        layers={layers}
        activeLayerId={activeLayerId}
        tool={tool}
        color={color}
        brushSize={brushSize}
        opacity={opacity}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        zoom={zoom}
        leftInset={agentOpen ? 320 : 56}
        onLayersChange={setLayers}
      />

      <ImageStudioMiniHeader
        creditsRemaining={creditsRemaining}
        zoom={zoom}
        agentOpen={agentOpen}
        onToggleAgent={() => setAgentOpen((open) => !open)}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 3))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.2))}
        onExport={() => exportImage("png")}
      />

      <div
        className={cn(
          "studio-agent pointer-events-auto group absolute bottom-24 top-16 z-20 overflow-hidden border-r border-zinc-200/90 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out",
          agentOpen
            ? "left-0 w-[min(360px,calc(100%-2rem))] rounded-r-2xl"
            : "left-0 w-12 rounded-r-2xl hover:w-[min(360px,calc(100%-2rem))]",
        )}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            "h-full w-full transition-opacity duration-300",
            agentOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <ImageStudioAgentPanel
            messages={agentMessages}
            isBusy={agentBusy}
            onSubmit={runAgentPrompt}
            onClear={() => setAgentMessages([])}
            onClose={() => setAgentOpen(false)}
            onStarterSelect={(starter) => {
              setAgentOpen(true);
              void runAgentPrompt(starter);
            }}
          />
        </div>
        {!agentOpen ? (
          <button
            type="button"
            onClick={() => setAgentOpen(true)}
            className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-300 group-hover:opacity-0"
            aria-label="Open agent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 shadow-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
          </button>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center">
        <ImageStudioFloatingToolbar
          prompt={toolbarPrompt}
          onPromptChange={setToolbarPrompt}
          onPromptSubmit={() => void runAgentPrompt(toolbarPrompt)}
          isSubmitting={agentBusy}
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          opacity={opacity}
          onOpacityChange={setOpacity}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          agentOpen={agentOpen}
          onToggleAgent={() => setAgentOpen((open) => !open)}
          layersOpen={showLayersPanel}
          onToggleLayers={() => setShowLayersPanel((open) => !open)}
        />
      </div>

      <AnimatePresence>
        {showLayersPanel ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-zinc-900/20 backdrop-blur-[1px]"
              aria-label="Close layers panel"
              onClick={() => setShowLayersPanel(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute right-0 top-0 z-50 h-full shadow-2xl"
            >
              <ImageStudioLayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onLayerSelect={setActiveLayerId}
                onLayerAdd={() => addLayer()}
                onLayerDelete={deleteLayer}
                onLayerUpdate={updateLayer}
                onLayerReorder={reorderLayer}
                onLayerDuplicate={duplicateLayer}
                onMergeVisible={mergeVisibleLayers}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
