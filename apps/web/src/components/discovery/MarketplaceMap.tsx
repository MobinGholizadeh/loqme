"use client";
import * as RedesignIcons from "lucide-react";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { StoreMapPin } from "@loqme/types";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface MarketplaceMapProps {
  pins: StoreMapPin[];
  center?: [number, number];
  zoom?: number;
  onSelectStore?: (store: StoreMapPin) => void;
  selectedStoreId?: string;
  className?: string;
}

export function MarketplaceMap({
  pins,
  center = [37.5342, 45.0681], // Default: Urmia Daneshkadeh
  zoom = 14,
  onSelectStore,
  selectedStoreId,
  className = "",
}: MarketplaceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const fittedPinsRef = useRef("");
  const [activePin, setActivePin] = useState<StoreMapPin | null>(null);
  const [locationError, setLocationError] = useState("");
  const [tileError, setTileError] = useState(false);
  const motionOptions = () => ({
    animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    duration: 0.8,
  });
  useEffect(() => {
    setActivePin((current) =>
      current ? pins.find((pin) => pin.id === current.id) || null : null,
    );
  }, [pins]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    // Add Map.ir Persian tiles (EPSG:3857)
    const mapApiKey = process.env.NEXT_PUBLIC_MAP_API_KEY || "";
    
    // Diagnostic logging
    if (mapApiKey) {
      console.log(
        "[Map.ir] NEXT_PUBLIC_MAP_API_KEY detected successfully (length: " +
          mapApiKey.length +
          ", preview: " +
          mapApiKey.substring(0, 12) +
          "..." +
          mapApiKey.substring(mapApiKey.length - 8) +
          ")",
      );
    } else {
      console.warn(
        "[Map.ir] NEXT_PUBLIC_MAP_API_KEY is NOT set or empty! Tiles will be requested without an API key parameter.",
      );
    }

    const tileUrl = mapApiKey
      ? `https://map.ir/shiveh/xyz/1.0.0/Shiveh:Shiveh@EPSG:3857@png/{z}/{x}/{y}.png?x-api-key=${mapApiKey}`
      : "https://map.ir/shiveh/xyz/1.0.0/Shiveh:Shiveh@EPSG:3857@png/{z}/{x}/{y}.png";

    console.log(
      "[Map.ir] Initializing TileLayer with URL template:",
      tileUrl.replace(mapApiKey, mapApiKey ? "[REDACTED_KEY]" : ""),
    );

    const tiles = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://map.ir" target="_blank" rel="noopener noreferrer">Map.ir</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(map);

    tiles.on("tileerror", (errorEvent: any) => {
      console.error("[Map.ir] Tile load failed:", {
        tileUrl: errorEvent?.tile?.src,
        coords: errorEvent?.coords,
        error: errorEvent?.error,
      });
      setTileError(true);
    });

    tiles.on("tileload", () => {
      setTileError(false);
    });

    // Zoom control at top right (suited for RTL)
    L.control.zoom({ position: "topright" }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      fittedPinsRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when prop changes
  const targetLat = center[0];
  const targetLng = center[1];
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [targetLat, targetLng],
        zoom,
        motionOptions(),
      );
    }
  }, [targetLat, targetLng, zoom]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    pins.forEach((pin) => {
      // Create custom SVG Teal pin
      const isSelected = selectedStoreId === pin.id || activePin?.id === pin.id;
      const countLabel = toPersianDigits(pin.activeListingCount);

      const iconSvg = `
        <div style="position: relative; width: 42px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="42" height="50" viewBox="0 0 42 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 0C9.402 0 0 9.402 0 21C0 34.5 21 50 21 50C21 50 42 34.5 42 21C42 9.402 32.598 0 21 0Z" 
                  fill="${isSelected ? "#0F766E" : "#115E59"}"
                  stroke="#FFFFFF" 
                  stroke-width="2.5" 
                  filter="drop-shadow(0 4px 6px rgba(15, 118, 110, 0.35))"/>
            <circle cx="21" cy="19" r="13" fill="#FFFFFF"/>
            <text x="21" y="24" text-anchor="middle" fill="#0F766E" font-size="13" font-weight="bold" font-family="Vazirmatn, sans-serif">${countLabel}</text>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-loqme-pin",
        html: iconSvg,
        iconSize: [42, 50],
        iconAnchor: [21, 50],
      });

      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: customIcon,
        title: pin.businessNameFa,
        alt: pin.businessNameFa,
      }).addTo(map);

      marker.on("click", () => {
        setActivePin(pin);
        if (onSelectStore) onSelectStore(pin);
        map.flyTo([pin.latitude, pin.longitude], 15, motionOptions());
      });

      markersRef.current[pin.id] = marker;
    });
    const pinKey = pins
      .map((pin) => `${pin.id}:${pin.latitude}:${pin.longitude}`)
      .join("|");
    if (pins.length && fittedPinsRef.current !== pinKey) {
      map.fitBounds(
        L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude])),
        {
          padding: [60, 60],
          maxZoom: zoom,
          animate: false,
        },
      );
    }
    fittedPinsRef.current = pinKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, selectedStoreId, activePin?.id]);

  const handleRecenter = (coords: [number, number], zoomLevel = 14) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, zoomLevel, motionOptions());
    }
  };

  const handleLocateMe = () => {
    setLocationError("");
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          mapInstanceRef.current?.flyTo(userCoords, 15, motionOptions());
        },
        (err) => {
          setLocationError(
            "موقعیت شما در دسترس نیست. دسترسی مکان را در مرورگر بررسی کنید.",
          );
        },
      );
    }
  };

  return (
    <div
      className={`relative w-full h-[480px] md:h-[580px] rounded-lg overflow-hidden shadow-card border border-loqme-neutral-200 ${className}`}
    >
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating City & Quick Action Controls */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <button
          type="button"
          className="icon-button bg-white border border-loqme-neutral-200"
          title="بازگشت به محله انتخاب‌شده"
          onClick={() => handleRecenter(center, zoom)}
        >
          <RedesignIcons.RotateCcw size={18} />
        </button>

        <button
          type="button"
          onClick={handleLocateMe}
          title="نمایش موقعیت من روی نقشه"
          className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-lg shadow-dropdown border border-loqme-neutral-200 text-loqme-neutral-700 hover:text-loqme-primary-600 flex items-center justify-center transition-colors self-start"
        >
          <RedesignIcons.LocateFixed size={20} aria-hidden="true" />
        </button>
      </div>

      {locationError && (
        <p
          role="status"
          className="absolute top-20 inset-x-4 z-[400] bg-white p-3 text-xs text-rose-700"
        >
          {locationError}
        </p>
      )}
      {tileError && (
        <p
          role="status"
          className="absolute top-28 inset-x-4 z-[400] bg-white p-3 text-xs text-rose-700"
        >
          تصویر نقشه بارگذاری نشد. فهرست فروشگاه‌ها همچنان در دسترس است.
        </p>
      )}
      {/* Selected Store Bottom Drawer Preview */}
      {activePin && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/98 backdrop-blur-md rounded-lg p-4 shadow-float border border-loqme-neutral-200 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-loqme-neutral-900">
                    {activePin.businessNameFa}
                  </h4>
                  {activePin.ratingAverage > 0 && (
                    <Badge variant="brand" size="sm">
                      ★ {toPersianDigits(activePin.ratingAverage.toFixed(1))}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-loqme-neutral-500 line-clamp-1">
                  {activePin.addressFa}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePin(null)}
                className="icon-button"
                aria-label="بستن جزئیات فروشگاه"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-loqme-neutral-100">
              <div className="text-xs">
                <span className="text-loqme-neutral-500">موجودی فعال: </span>
                <span className="font-bold text-loqme-primary-700">
                  {toPersianDigits(activePin.activeListingCount)} بسته
                </span>
                {activePin.minPriceToman && (
                  <span className="text-loqme-neutral-500 mr-2">
                    (از {formatToman(activePin.minPriceToman)})
                  </span>
                )}
              </div>

              <Link
                className="action-link"
                href={`/merchants/${activePin.merchantId}`}
              >
                مشاهده بسته‌ها
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
