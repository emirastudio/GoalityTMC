"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check, RotateCw } from "lucide-react";

interface Area { x: number; y: number; width: number; height: number; }

interface Props {
  src: string;
  aspect?: number;        // default 1 (square)
  shape?: "rect" | "round";
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.addEventListener("load", () => res(img));
    img.addEventListener("error", rej);
    img.src = imageSrc;
  });

  // Output size: preserve crop aspect ratio, cap longest side at 1920px
  const MAX_OUT = 1920;
  const cropAspect = pixelCrop.width / pixelCrop.height;
  let outW: number, outH: number;
  if (cropAspect >= 1) {
    outW = Math.min(pixelCrop.width, MAX_OUT);
    outH = Math.round(outW / cropAspect);
  } else {
    outH = Math.min(pixelCrop.height, MAX_OUT);
    outW = Math.round(outH * cropAspect);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = outW;
  canvas.height = outH;

  ctx.fillStyle = "transparent";

  // Rotate if needed
  const rad = (rotation * Math.PI) / 180;
  const safeArea = Math.max(image.width, image.height) * 2;

  const offscreen = document.createElement("canvas");
  offscreen.width = safeArea;
  offscreen.height = safeArea;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.translate(safeArea / 2, safeArea / 2);
  offCtx.rotate(rad);
  offCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Map crop coords to rotated canvas
  const cropX = pixelCrop.x + (safeArea / 2 - image.width / 2);
  const cropY = pixelCrop.y + (safeArea / 2 - image.height / 2);

  ctx.drawImage(
    offscreen,
    cropX, cropY,
    pixelCrop.width, pixelCrop.height,
    0, 0, outW, outH
  );

  return new Promise<Blob>((res) => canvas.toBlob(b => res(b!), "image/png", 0.95));
}

export function ImageCropperModal({ src, aspect = 1, shape = "rect", onDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, cropped: Area) => {
    setCroppedAreaPixels(cropped);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    const blob = await getCroppedBlob(src, croppedAreaPixels, rotation);
    onDone(blob);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: "var(--cat-text)" }}>
              Обрезать изображение
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              Перемещайте и масштабируйте фото
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "var(--cat-tag-bg)" }}
          >
            <X className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative" style={{ height: "380px", background: "#111" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#0d0d0d" },
              cropAreaStyle: {
                border: "2px solid var(--cat-accent)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-4 border-t" style={{ borderColor: "var(--cat-card-border)" }}>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
            <input
              type="range"
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-[var(--cat-accent)] h-1.5 rounded-full cursor-pointer"
              style={{ accentColor: "var(--cat-accent)" }}
            />
            <ZoomIn className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
            <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "var(--cat-text-muted)" }}>
              {zoom.toFixed(1)}×
            </span>
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
            <input
              type="range"
              min={-180} max={180} step={1}
              value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full cursor-pointer"
              style={{ accentColor: "var(--cat-accent)" }}
            />
            <button
              onClick={() => setRotation(0)}
              className="text-[10px] px-2 py-1 rounded-md font-medium"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
            >
              {rotation}°
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark, var(--cat-accent)))",
                color: "#000",
                boxShadow: "0 4px 16px var(--cat-accent-glow)",
              }}
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
