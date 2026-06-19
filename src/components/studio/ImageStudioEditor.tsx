"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  RotateCcw,
  Undo2,
  Redo2,
  Pencil,
  Square,
  Circle,
  Type,
  Minus,
  ChevronLeft,
  Eraser,
  MousePointerClick,
  ImagePlus,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImageStudioEditor({ initialImageUrl }: { initialImageUrl?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"select" | "brush" | "eraser" | "rectangle" | "circle" | "line" | "text">("brush");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [fontSize, setFontSize] = useState(24);

  const colors = [
    "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
    "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#78716c",
  ];

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newIndex = historyIndex - 1;
    const imageData = history[newIndex];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newIndex = historyIndex + 1;
    const imageData = history[newIndex];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const loadImage = useCallback((src: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 800;
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([imageData]);
      setHistoryIndex(0);
      setImageLoaded(true);
    };
    img.src = src;
  }, []);

  useEffect(() => {
    if (initialImageUrl) {
      loadImage(initialImageUrl);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([imageData]);
          setHistoryIndex(0);
          setImageLoaded(true);
        }
      }
    }
  }, [initialImageUrl, loadImage]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showTextInput) return;
    const pos = getCanvasPos(e);
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const pos = getCanvasPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (tool === "brush" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "rectangle") {
      const imageData = history[historyIndex];
      if (imageData) ctx.putImageData(imageData, 0, 0);
      ctx.beginPath();
      ctx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      ctx.stroke();
    } else if (tool === "circle") {
      const imageData = history[historyIndex];
      if (imageData) ctx.putImageData(imageData, 0, 0);
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === "line") {
      const imageData = history[historyIndex];
      if (imageData) ctx.putImageData(imageData, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPos(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    saveState();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "text" || showTextInput) return;
    const pos = getCanvasPos(e);
    setTextPos(pos);
    setShowTextInput(true);
  };

  const addText = () => {
    if (!textPos || !textInput.trim()) {
      setShowTextInput(false);
      setTextInput("");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(textInput, textPos.x, textPos.y);
    saveState();
    setShowTextInput(false);
    setTextInput("");
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "studio-export.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) loadImage(result);
    };
    reader.readAsDataURL(file);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const tools = [
    { id: "select" as const, icon: MousePointerClick, label: "Select" },
    { id: "brush" as const, icon: Pencil, label: "Brush" },
    { id: "eraser" as const, icon: Eraser, label: "Eraser" },
    { id: "rectangle" as const, icon: Square, label: "Rect" },
    { id: "circle" as const, icon: Circle, label: "Circle" },
    { id: "line" as const, icon: Minus, label: "Line" },
    { id: "text" as const, icon: Type, label: "Text" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <Link href="/dashboard">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="sm" className="gap-1 text-zinc-600">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </motion.div>
        </Link>
        <div className="mx-2 h-5 w-px bg-zinc-200" />

        {tools.map((t) => (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              tool === t.id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            )}
            title={t.label}
          >
            <t.icon className="h-4 w-4" />
          </motion.button>
        ))}

        <div className="mx-2 h-5 w-px bg-zinc-200" />

        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={undo} className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 rounded-md">
          <Undo2 className="h-4 w-4" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={redo} className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 rounded-md">
          <Redo2 className="h-4 w-4" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={clearCanvas} className="h-8 w-8 text-zinc-600 hover:bg-zinc-100 rounded-md">
          <RotateCcw className="h-4 w-4" />
        </motion.button>

        <div className="mx-2 h-5 w-px bg-zinc-200" />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "h-5 w-5 rounded-full border transition-transform",
                color === c ? "scale-110 border-zinc-400" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="mx-2 h-5 w-px bg-zinc-200" />

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Size</span>
          <input
            type="range"
            min={1}
            max={50}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-zinc-900"
          />
          <span className="w-5 text-xs text-zinc-500">{brushSize}</span>
        </div>

        <div className="mx-2 h-5 w-px bg-zinc-200" />

        {/* Opacity */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Opacity</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-20 accent-zinc-900"
          />
        </div>

        <div className="flex-1" />

        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </motion.div>
        </label>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button size="sm" className="gap-2 bg-zinc-900" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </motion.div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 bg-zinc-100 flex items-center justify-center overflow-auto p-4">
        {showTextInput && textPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute z-50 flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-lg"
            style={{ left: textPos.x, top: textPos.y - 80 }}
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
                }
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Size</span>
              <input
                type="range"
                min={12}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20 accent-zinc-900"
              />
              <span className="w-6 text-xs text-zinc-500">{fontSize}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1" onClick={addText}>
                <Check className="h-3 w-3" /> Add
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-red-500" onClick={() => { setShowTextInput(false); setTextInput(""); }}>
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          </motion.div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          className={cn(
            "max-w-full max-h-full shadow-lg",
            tool === "text" ? "cursor-text" : "cursor-crosshair"
          )}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <ImagePlus className="h-10 w-10" />
            <p className="text-sm">Upload an image or click to start with a blank canvas</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload Image
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
