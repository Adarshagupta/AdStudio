"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ImageStudioCanvas, ImageStudioCanvasRef } from "./ImageStudioCanvas";
import { ImageStudioToolbar } from "./ImageStudioToolbar";
import { ImageStudioLayersPanel } from "./ImageStudioLayersPanel";
import { ImageStudioAIPanel } from "./ImageStudioAIPanel";
import { ImageStudioTopBar } from "./ImageStudioTopBar";

export type StudioTool =
  | "select"
  | "brush"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "crop"
  | "eyedropper"
  | "shape";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  canvas: HTMLCanvasElement;
  thumbnail?: string;
}

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
  userId,
  workspaceId,
  creditsRemaining,
  initialImageUrl = null,
  initialWidth,
  initialHeight,
}: {
  userId: string;
  workspaceId: string;
  creditsRemaining: number;
  initialImageUrl?: string | null;
  initialWidth?: number;
  initialHeight?: number;
}) {
  const [tool, setTool] = useState<StudioTool>("select");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [fontWeight, setFontWeight] = useState("normal");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showLayersPanel] = useState(true);
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
      handleNewCanvas(initialWidth ?? 1200, initialHeight ?? 800);
    };
    img.src = url;
  }, [handleNewCanvas, initialHeight, initialWidth]);

  const handleImportImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) loadImageFromUrl(result);
    };
    reader.readAsDataURL(file);
  }, [loadImageFromUrl]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let imageUrl = initialImageUrl;
    if (!imageUrl && typeof window !== "undefined") {
      const stored = sessionStorage.getItem("studio-image-url");
      if (stored) {
        imageUrl = stored;
        sessionStorage.removeItem("studio-image-url");
      }
    }

    if (imageUrl) {
      loadImageFromUrl(imageUrl);
      return;
    }

    handleNewCanvas(initialWidth ?? 1200, initialHeight ?? 800);
  }, [handleNewCanvas, initialHeight, initialImageUrl, initialWidth, loadImageFromUrl]);

  return (
    <div className="flex h-screen w-screen flex-col bg-[#f5f5f5] overflow-hidden">
      <ImageStudioTopBar
        onExport={() => exportImage("png")}
        onExportJpeg={() => exportImage("jpeg", 0.9)}
        onNewCanvas={() => handleNewCanvas(1200, 800)}
        onImport={handleImportImage}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 3))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.2))}
        onZoomReset={() => setZoom(1)}
        zoom={zoom}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onResizeCanvas={handleNewCanvas}
        creditsRemaining={creditsRemaining}
      />
      <div className="flex flex-1 overflow-hidden">
        <ImageStudioToolbar
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
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          fontWeight={fontWeight}
          onFontWeightChange={setFontWeight}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
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
            onLayersChange={setLayers}
          />
        </div>
        {showLayersPanel && (
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
        )}
        {showAIPanel && (
          <ImageStudioAIPanel
            userId={userId}
            workspaceId={workspaceId}
            creditsRemaining={creditsRemaining}
            onGeneratedImage={(url) => addLayer("AI Generated", url)}
            onClose={() => setShowAIPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
