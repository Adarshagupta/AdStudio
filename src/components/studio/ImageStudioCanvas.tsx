"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";
import type { Layer, StudioTool } from "./image-studio-types";

interface ImageStudioCanvasProps {
  layers: Layer[];
  activeLayerId: string | null;
  tool: StudioTool;
  color: string;
  brushSize: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  /** Extra left inset when agent panel is open (keeps artboard in visible sandbox). */
  leftInset?: number;
  onLayersChange?: (layers: Layer[]) => void;
}

export interface ImageStudioCanvasRef {
  getCanvasDataUrl: () => string;
  getActiveLayerCanvas: () => HTMLCanvasElement | null;
}

export const ImageStudioCanvas = forwardRef<
  ImageStudioCanvasRef,
  ImageStudioCanvasProps
>(function ImageStudioCanvas(
  {
    layers,
    activeLayerId,
    tool,
    color,
    brushSize,
    opacity,
    fontSize,
    fontFamily,
    fontWeight,
    canvasWidth,
    canvasHeight,
    zoom,
    leftInset = 0,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [pickedColor, setPickedColor] = useState<string | null>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  useImperativeHandle(ref, () => ({
    getCanvasDataUrl: () => {
      const displayCanvas = displayCanvasRef.current;
      if (!displayCanvas) return "";
      return displayCanvas.toDataURL("image/png");
    },
    getActiveLayerCanvas: () => activeLayer?.canvas ?? null,
  }));

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return { x: 0, y: 0 };
    const rect = displayCanvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvasWidth,
      y: ((clientY - rect.top) / rect.height) * canvasHeight,
    };
  };

  const redrawDisplay = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;
    displayCanvas.width = canvasWidth;
    displayCanvas.height = canvasHeight;
    const ctx = displayCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw checkerboard background for transparency
    const checkerSize = 20;
    for (let y = 0; y < canvasHeight; y += checkerSize) {
      for (let x = 0; x < canvasWidth; x += checkerSize) {
        ctx.fillStyle = (x / checkerSize + y / checkerSize) % 2 === 0 ? "#ffffff" : "#e5e5e5";
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    layers.forEach((layer) => {
      if (!layer.visible) return;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
    });
    ctx.globalAlpha = 1;
  }, [layers, canvasWidth, canvasHeight]);

  useEffect(() => {
    redrawDisplay();
  }, [redrawDisplay]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateFit = () => {
      const rect = container.getBoundingClientRect();
      const padX = 48;
      const padTop = 72;
      const padBottom = 160;
      const maxW = Math.max(rect.width - padX * 2 - leftInset, 200);
      const maxH = Math.max(rect.height - padTop - padBottom, 200);
      const scale = Math.min(maxW / canvasWidth, maxH / canvasHeight, 1);
      setFitScale(Math.max(scale, 0.15));
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(container);
    window.addEventListener("resize", updateFit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [canvasWidth, canvasHeight, leftInset]);

  const displayScale = fitScale * zoom;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeLayer || activeLayer.locked) return;
    if (showTextInput) return;
    const pos = getCanvasPos(e);

    if (tool === "eyedropper") {
      const displayCanvas = displayCanvasRef.current;
      if (!displayCanvas) return;
      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
      setPickedColor(hex);
      return;
    }

    if (tool === "text") {
      setTextPos(pos);
      setShowTextInput(true);
      setTextInput("");
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);

    const layerCtx = activeLayer.canvas.getContext("2d");
    if (!layerCtx) return;

    layerCtx.globalAlpha = opacity;
    layerCtx.strokeStyle = color;
    layerCtx.fillStyle = color;
    layerCtx.lineWidth = brushSize;
    layerCtx.lineCap = "round";
    layerCtx.lineJoin = "round";

    if (tool === "brush" || tool === "eraser") {
      layerCtx.beginPath();
      layerCtx.moveTo(pos.x, pos.y);
      if (tool === "eraser") {
        layerCtx.globalCompositeOperation = "destination-out";
      } else {
        layerCtx.globalCompositeOperation = "source-over";
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !activeLayer) return;
    const pos = getCanvasPos(e);
    const layerCtx = activeLayer.canvas.getContext("2d");
    if (!layerCtx) return;

    if (tool === "brush" || tool === "eraser") {
      layerCtx.lineTo(pos.x, pos.y);
      layerCtx.stroke();
    } else if (tool === "rectangle") {
      redrawDisplay();
      const displayCtx = displayCanvasRef.current?.getContext("2d");
      if (!displayCtx) return;
      displayCtx.strokeStyle = color;
      displayCtx.lineWidth = brushSize;
      displayCtx.globalAlpha = opacity;
      displayCtx.beginPath();
      displayCtx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      displayCtx.stroke();
    } else if (tool === "circle") {
      redrawDisplay();
      const displayCtx = displayCanvasRef.current?.getContext("2d");
      if (!displayCtx) return;
      displayCtx.strokeStyle = color;
      displayCtx.lineWidth = brushSize;
      displayCtx.globalAlpha = opacity;
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      displayCtx.beginPath();
      displayCtx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      displayCtx.stroke();
    } else if (tool === "line" || tool === "arrow") {
      redrawDisplay();
      const displayCtx = displayCanvasRef.current?.getContext("2d");
      if (!displayCtx) return;
      displayCtx.strokeStyle = color;
      displayCtx.lineWidth = brushSize;
      displayCtx.globalAlpha = opacity;
      displayCtx.beginPath();
      displayCtx.moveTo(startPos.x, startPos.y);
      displayCtx.lineTo(pos.x, pos.y);
      displayCtx.stroke();
      if (tool === "arrow") {
        const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
        const arrowLength = brushSize * 3;
        displayCtx.beginPath();
        displayCtx.moveTo(pos.x, pos.y);
        displayCtx.lineTo(
          pos.x - arrowLength * Math.cos(angle - Math.PI / 6),
          pos.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        displayCtx.moveTo(pos.x, pos.y);
        displayCtx.lineTo(
          pos.x - arrowLength * Math.cos(angle + Math.PI / 6),
          pos.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        displayCtx.stroke();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !activeLayer) return;
    setIsDrawing(false);
    const pos = getCanvasPos(e);
    const layerCtx = activeLayer.canvas.getContext("2d");
    if (!layerCtx) return;

    layerCtx.globalAlpha = opacity;
    layerCtx.strokeStyle = color;
    layerCtx.fillStyle = color;
    layerCtx.lineWidth = brushSize;
    layerCtx.lineCap = "round";
    layerCtx.lineJoin = "round";
    layerCtx.globalCompositeOperation = "source-over";

    if (tool === "rectangle") {
      layerCtx.beginPath();
      layerCtx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      layerCtx.stroke();
    } else if (tool === "circle") {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      layerCtx.beginPath();
      layerCtx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      layerCtx.stroke();
    } else if (tool === "line" || tool === "arrow") {
      layerCtx.beginPath();
      layerCtx.moveTo(startPos.x, startPos.y);
      layerCtx.lineTo(pos.x, pos.y);
      layerCtx.stroke();
      if (tool === "arrow") {
        const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
        const arrowLength = brushSize * 3;
        layerCtx.beginPath();
        layerCtx.moveTo(pos.x, pos.y);
        layerCtx.lineTo(
          pos.x - arrowLength * Math.cos(angle - Math.PI / 6),
          pos.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        layerCtx.moveTo(pos.x, pos.y);
        layerCtx.lineTo(
          pos.x - arrowLength * Math.cos(angle + Math.PI / 6),
          pos.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        layerCtx.stroke();
      }
    }

    layerCtx.globalCompositeOperation = "source-over";
    setStartPos(null);
    redrawDisplay();
  };

  const addText = () => {
    if (!textPos || !textInput.trim() || !activeLayer) return;
    const layerCtx = activeLayer.canvas.getContext("2d");
    if (!layerCtx) return;
    layerCtx.globalAlpha = opacity;
    layerCtx.fillStyle = color;
    layerCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    layerCtx.fillText(textInput, textPos.x, textPos.y);
    redrawDisplay();
    setShowTextInput(false);
    setTextInput("");
    setTextPos(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,#fafafa,#ececef)] p-4 pb-28 pt-16 md:p-6 md:pb-32 md:pt-20"
      style={{ paddingLeft: leftInset > 0 ? leftInset / 2 : undefined }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_16px_48px_rgba(15,23,42,0.07)] ring-1 ring-zinc-200/70"
        style={{
          width: canvasWidth * displayScale,
          height: canvasHeight * displayScale,
        }}
      >
        <canvas
          ref={displayCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            "absolute inset-0 h-full w-full",
            tool === "text" ? "cursor-text" : "cursor-crosshair"
          )}
        />
        {showTextInput && textPos && (
          <div
            className="absolute z-50 flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-lg"
            style={{
              left: textPos.x * displayScale,
              top: textPos.y * displayScale - 80,
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") addText();
                if (e.key === "Escape") {
                  setShowTextInput(false);
                  setTextInput("");
                  setTextPos(null);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white hover:bg-zinc-800"
                onClick={addText}
              >
                Add
              </button>
              <button
                className="rounded-md px-3 py-1 text-sm text-red-500 hover:bg-red-50"
                onClick={() => {
                  setShowTextInput(false);
                  setTextInput("");
                  setTextPos(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {pickedColor && (
        <div className="absolute bottom-4 left-4 rounded-lg bg-white px-3 py-2 shadow-lg text-sm text-zinc-600">
          Picked: <span className="inline-block h-4 w-4 rounded border align-middle" style={{ backgroundColor: pickedColor }} /> {pickedColor}
        </div>
      )}
    </div>
  );
});
