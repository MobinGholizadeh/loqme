"use client";
import { DialogSurface } from "@/components/ui/DialogSurface";
import * as RedesignIcons from "lucide-react";

import React, { useRef, useState, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface QRCameraScannerProps {
  isOpen: boolean;
  onScan: (decodedText: string) => void;
  onClose: () => void;
  onFallbackToManual?: () => void;
}

export const QRCameraScanner: React.FC<QRCameraScannerProps> = ({
  isOpen,
  onScan,
  onClose,
  onFallbackToManual,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stop camera media stream
  const stopStream = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Frame scanning loop
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      // Valid code scanned!
      stopStream();
      onScan(code.data);
      return;
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, [onScan, stopStream]);

  // Start camera media stream
  const startStream = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);

    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setErrorMessage("مرورگر شما از دسترسی به دوربین پشتیبانی نمی‌کند");
      setIsInitializing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setHasCameraPermission(true);
        setIsInitializing(false);
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setHasCameraPermission(false);
      setErrorMessage(
        "دسترسی به دوربین مسدود شده یا خطایی در راه‌اندازی رخ داده است",
      );
      setIsInitializing(false);
    }
  }, [facingMode, scanFrame, stopStream]);

  useEffect(() => {
    if (isOpen) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startStream, stopStream]);

  if (!isOpen) return null;

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <DialogSurface onClose={onClose}>
      <div className="relative w-full max-w-md bg-loqme-neutral-900 rounded-lg overflow-hidden shadow-2xl border border-loqme-neutral-800 text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-loqme-neutral-800 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              <RedesignIcons.Camera size={20} aria-hidden="true" />
            </span>
            <h2 className="font-bold text-sm text-white">
              اسکن بارکد تحویل حضوری
            </h2>
          </div>
          <button
            aria-label="بستن"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-loqme-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Hidden Canvas for decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {isInitializing ? (
            <div className="relative z-10 text-center space-y-2 p-6">
              <Spinner size="lg" variant="white" className="mx-auto" />
              <p className="text-xs text-loqme-neutral-500">
                در حال فعال‌سازی دوربین...
              </p>
            </div>
          ) : errorMessage || hasCameraPermission === false ? (
            <div className="relative z-10 p-6 text-center space-y-4">
              <div className="text-3xl">🚫</div>
              <p className="text-xs text-loqme-neutral-300 max-w-xs mx-auto leading-relaxed">
                {errorMessage || "دسترسی به دوربین مسدود شده است."}
              </p>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => startStream()}
                >
                  تلاش مجدد
                </Button>
                {onFallbackToManual && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => {
                      onClose();
                      onFallbackToManual();
                    }}
                  >
                    ورود دستی کد ۴ رقمی
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Active Scanning Overlay */
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Darkened vignette around target */}
              <div className="relative w-64 h-64 rounded-lg border-2 border-dashed border-loqme-primary-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
                {/* Glowing Corner Accents */}
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-loqme-primary-400 rounded-tr-xl" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-loqme-primary-400 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-loqme-primary-400 rounded-br-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-loqme-primary-400 rounded-bl-xl" />

                {/* Animated Laser Scanning Line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-loqme-primary-400 to-transparent shadow-[0_0_12px_#14b8a6] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 px-6 flex items-center justify-between bg-black/60 border-t border-loqme-neutral-800 text-xs">
          <span className="text-loqme-neutral-500 text-[11px]">
            کادر را روی بارکد مشتری قرار دهید
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleCamera}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              title="تغییر دوربین"
            >
              🔄 چرخش دوربین
            </button>

            {onFallbackToManual && (
              <button
                onClick={() => {
                  onClose();
                  onFallbackToManual();
                }}
                className="px-3 py-1.5 rounded-lg bg-loqme-primary-600 hover:bg-loqme-primary-700 text-white text-xs font-bold transition-colors"
              >
                کد ۴ رقمی
              </button>
            )}
          </div>
        </div>
      </div>
    </DialogSurface>
  );
};
