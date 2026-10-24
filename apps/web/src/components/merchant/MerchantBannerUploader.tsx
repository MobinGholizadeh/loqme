/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Crop,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Store,
} from "lucide-react";
import { RippleButton } from "@/components/magicui/ripple-button";
import { Modal } from "@/components/ui/Modal";
import { toPersianDigits } from "@/lib/utils/persian";
import Image from "next/image";

interface MerchantBannerUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
  businessNameFa?: string;
}

export function MerchantBannerUploader({
  value,
  onChange,
  onBusyChange,
  businessNameFa = "فروشگاه شما",
}: MerchantBannerUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("banner.webp");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Cropper transform state
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 to 3.0
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270

  // Image natural dimensions & preview container dimensions
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 200,
  });
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 400,
  });

  // Pointer drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update container size dynamically on resize
  useEffect(() => {
    if (!cropStageRef.current) return;
    const updateSize = () => {
      if (cropStageRef.current) {
        const rect = cropStageRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setStageDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(cropStageRef.current);
    return () => observer.disconnect();
  }, [isModalOpen]);

  // Handle file input selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("فرمت فایل باید JPG، PNG یا WebP باشد");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("حجم فایل نباید بیش از ۵ مگابایت باشد");
      return;
    }

    setImageError(null);
    setSelectedFileName(file.name.replace(/\.[^/.]+$/, "") + ".webp");

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setSelectedImageSrc(event.target.result);
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setIsModalOpen(true);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Open editor with current existing banner
  const openEditorWithCurrent = () => {
    if (!value) return;
    setSelectedImageSrc(value);
    setSelectedFileName("merchant-banner.webp");
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setIsModalOpen(true);
  };

  // Calculate cover scale
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotated ? naturalDimensions.height : naturalDimensions.width;
  const effectiveHeight = isRotated ? naturalDimensions.width : naturalDimensions.height;

  const scaleCover = Math.max(
    stageDimensions.width / (effectiveWidth || 1),
    stageDimensions.height / (effectiveHeight || 1)
  );
  const totalScale = scaleCover * zoom;

  // Clamping helper
  const clampPan = useCallback(
    (newPan: { x: number; y: number }, currentZoom: number, currentRotation: number) => {
      const rot = currentRotation === 90 || currentRotation === 270;
      const effW = rot ? naturalDimensions.height : naturalDimensions.width;
      const effH = rot ? naturalDimensions.width : naturalDimensions.height;
      const currentScaleCover = Math.max(
        stageDimensions.width / (effW || 1),
        stageDimensions.height / (effH || 1)
      );
      const curTotalScale = currentScaleCover * currentZoom;
      const scaledW = effW * curTotalScale;
      const scaledH = effH * curTotalScale;

      const maxPanX = Math.max(0, (scaledW - stageDimensions.width) / 2);
      const maxPanY = Math.max(0, (scaledH - stageDimensions.height) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
      };
    },
    [naturalDimensions, stageDimensions]
  );

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextPan = {
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    };
    setPan(clampPan(nextPan, zoom, rotation));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => {
      const nextZoom = Math.max(1.0, Math.min(3.0, Number((prev + zoomDelta).toFixed(2))));
      setPan((currentPan) => clampPan(currentPan, nextZoom, rotation));
      return nextZoom;
    });
  };

  // Zoom slider change
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setPan((currentPan) => clampPan(currentPan, newZoom, rotation));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    setPan({ x: 0, y: 0 }); // Center when rotating
  };

  // Fit / Cover button
  const handleFit = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Reset all
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Apply crop & upload to /api/merchant/listings/image
  const handleApplyCrop = async () => {
    if (!selectedImageSrc || !imageRef.current) return;

    setIsUploading(true);
    onBusyChange?.(true);
    setImageError(null);

    try {
      const targetWidth = 1800;
      const targetHeight = 600; // exact 3:1 ratio
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("امکان پردازش تصویر در مرورگر فراهم نیست");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const exportScale = targetWidth / stageDimensions.width;

      ctx.save();
      // Move to center of canvas
      ctx.translate(targetWidth / 2, targetHeight / 2);
      // Pan scaled to canvas coordinates
      ctx.translate(pan.x * exportScale, pan.y * exportScale);
      // Rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Scaled draw dimensions
      const naturalW = naturalDimensions.width;
      const naturalH = naturalDimensions.height;
      const drawScale = totalScale * exportScale;
      const drawW = naturalW * drawScale;
      const drawH = naturalH * drawScale;

      ctx.drawImage(imageRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Convert to WebP or JPEG blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", 0.92);
      });

      if (!blob) {
        throw new Error("خطا در ایجاد خروجی تصویر");
      }

      const file = new File([blob], selectedFileName, { type: "image/webp" });

      const response = await fetch("/api/merchant/listings/image", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "بارگذاری بنر انجام نشد");
      }

      onChange(result.imageUrl);
      setIsModalOpen(false);
    } catch (err: any) {
      setImageError(err.message || "خطایی در ذخیره و بارگذاری بنر رخ داد");
    } finally {
      setIsUploading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Banner Container */}
      <div className="relative group">
        {value ? (
          <div className="relative w-full aspect-[3/1] min-h-[160px] sm:min-h-[220px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100">
            {/* The Actual Banner Image */}
            <Image
              src={value}
              alt="تصویر جلد فروشگاه"
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              priority
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/10 pointer-events-none" />

            {/* Live Storefront Identity Badge Preview Overlay */}
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-white/60 pointer-events-none">
              <div className="w-6 h-6 rounded-lg bg-[#1D616A] text-white flex items-center justify-center">
                <Store size={14} />
              </div>
              <span className="font-black text-xs text-slate-900">{businessNameFa}</span>
            </div>

            {/* Top Right Actions Bar (LinkedIn style) */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <RippleButton
                type="button"
                onClick={openEditorWithCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold shadow-md hover:bg-white hover:text-[#174F56] transition-all border border-white/80"
              >
                <Crop size={14} className="text-[#1D616A]" />
                <span>تنظیم و برش مجدد</span>
              </RippleButton>

              <RippleButton
                type="button"
                onClick={openFilePicker}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold shadow-md hover:bg-white hover:text-[#174F56] transition-all border border-white/80"
              >
                <Upload size={14} className="text-[#1D616A]" />
                <span>تغییر عکس</span>
              </RippleButton>

              <RippleButton
                type="button"
                onClick={() => onChange("")}
                aria-label="حذف بنر"
                className="p-1.5 rounded-xl bg-rose-50/95 backdrop-blur-md text-rose-700 shadow-md hover:bg-rose-100 transition-colors border border-rose-200"
              >
                <X size={15} />
              </RippleButton>
            </div>
          </div>
        ) : (
          /* Empty State Dropzone */
          <div
            onClick={openFilePicker}
            className="w-full aspect-[3/1] min-h-[160px] sm:min-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#1D616A] bg-slate-50/70 hover:bg-[#EFF7F4]/40 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#1D616A] group-hover:scale-110 group-hover:bg-[#1D616A] group-hover:text-white transition-all duration-300 mb-3">
              <Upload size={22} />
            </div>
            <p className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#174F56] transition-colors">
              برای بارگذاری تصویر جلد فروشگاه کلیک کنید یا عکس را اینجا بکشید
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-md">
              نسبت استاندارد ۳:۱ (پیشنهاد: ۱۸۰۰ × ۶۰۰ پیکسل) — ابزار برش و زوم خودکار همانند لینکدین پس از انتخاب تصویر فعال می‌شود
            </p>
          </div>
        )}
      </div>

      {imageError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{imageError}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* LinkedIn-Style Banner Crop & Edit Modal */}
      {/* ============================================================ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isUploading) setIsModalOpen(false);
        }}
        title="تنظیم و برش تصویر جلد فروشگاه"
        className="max-w-3xl w-full p-0 overflow-hidden bg-white rounded-3xl"
      >
        <div className="p-5 sm:p-6 space-y-5">
          {/* Instructions banner */}
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#1D616A] shrink-0" />
              <span>تصویر را بکشید تا کادر دلخواه قرار گیرد؛ با اسکرول یا نوار لغزنده زوم کنید</span>
            </div>
            <span className="font-bold text-slate-700 hidden sm:inline">نسبت ۳:۱</span>
          </div>

          {/* Interactive Crop Stage (Dark Room) */}
          <div className="relative w-full rounded-2xl bg-slate-950 overflow-hidden select-none p-3 sm:p-4 shadow-inner flex flex-col items-center justify-center">
            {/* Cutout Frame (Exact 3:1 Banner Aspect Ratio) */}
            <div
              ref={cropStageRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              className="relative w-full aspect-[3/1] max-h-[300px] rounded-xl overflow-hidden border-2 border-white/80 shadow-2xl cursor-grab active:cursor-grabbing touch-none"
            >
              {/* Invisible hidden image for natural dimension reading */}
              {selectedImageSrc && (
                <img
                  ref={(node) => {
                    imageRef.current = node;
                  }}
                  src={selectedImageSrc}
                  alt="منبع تصویر"
                  crossOrigin="anonymous"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setNaturalDimensions({
                      width: img.naturalWidth || 1200,
                      height: img.naturalHeight || 400,
                    });
                  }}
                  className="hidden"
                />
              )}

              {/* Transformed Visual Image inside Crop Box */}
              {selectedImageSrc && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px)`,
                  }}
                >
                  <img
                    src={selectedImageSrc}
                    alt="پیش‌نمایش برش"
                    draggable={false}
                    crossOrigin="anonymous"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${totalScale})`,
                      transformOrigin: "center center",
                      maxWidth: "none",
                      maxHeight: "none",
                    }}
                    className="will-change-transform"
                  />
                </div>
              )}

              {/* Subtle Rule-of-Thirds Grid Overlay */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                <div className="border-r border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-r border-b border-white/15" />
                <div className="border-b border-white/15" />
                <div className="border-r border-white/15" />
                <div className="border-r border-white/15" />
                <div />
              </div>

              {/* Corner framing brackets */}
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white pointer-events-none" />
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white pointer-events-none" />
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>با موس یا لمس، تصویر را داخل کادر جابجا کنید</span>
            </div>
          </div>

          {/* Controls Bar (Zoom, Rotate, Fit, Reset) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Zoom Slider */}
              <div className="flex items-center gap-3 flex-1">
                <RippleButton
                  type="button"
                  onClick={() => handleZoomChange(Math.max(1.0, Number((zoom - 0.1).toFixed(2))))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                  aria-label="کاهش بزرگنمایی"
                >
                  <ZoomOut size={16} />
                </RippleButton>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1D616A]"
                  aria-label="میزان زوم"
                />

                <RippleButton
                  type="button"
                  onClick={() => handleZoomChange(Math.min(3.0, Number((zoom + 0.1).toFixed(2))))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                  aria-label="افزایش بزرگنمایی"
                >
                  <ZoomIn size={16} />
                </RippleButton>

                <span className="font-bold text-xs text-slate-700 min-w-[42px] text-left" dir="ltr">
                  {toPersianDigits(Math.round(zoom * 100))}%
                </span>
              </div>

              {/* Utility Tools (Rotate, Fit, Reset) */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto border-t sm:border-t-0 sm:border-r border-slate-200 pt-2 sm:pt-0 sm:pr-3">
                <RippleButton
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200/80 transition-colors"
                  title="چرخش ۹۰ درجه"
                >
                  <RotateCw size={14} className="text-[#1D616A]" />
                  <span>چرخش</span>
                </RippleButton>

                <RippleButton
                  type="button"
                  onClick={handleFit}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200/80 transition-colors"
                  title="تطبیق و پر کردن کادر"
                >
                  <Maximize2 size={14} className="text-[#1D616A]" />
                  <span>تطبیق</span>
                </RippleButton>

                <RippleButton
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors"
                  title="بازنشانی تغییرات"
                >
                  <RotateCcw size={14} />
                  <span>بازنشانی</span>
                </RippleButton>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <RippleButton
              type="button"
              disabled={isUploading}
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
            >
              انصراف
            </RippleButton>

            <RippleButton
              type="button"
              disabled={isUploading}
              onClick={handleApplyCrop}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1D616A] hover:bg-[#174F56] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>در حال برش و بارگذاری…</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>تایید و ذخیره بنر</span>
                </>
              )}
            </RippleButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
