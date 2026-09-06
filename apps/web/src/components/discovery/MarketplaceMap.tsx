'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { StoreMapPin } from '@loqme/types';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

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
  className = '',
}: MarketplaceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [activePin, setActivePin] = useState<StoreMapPin | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    // Add CartoDB Positron / OSM clean tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control at top right (suited for RTL)
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when prop changes
  const targetLat = center[0];
  const targetLng = center[1];
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([targetLat, targetLng], zoom, { duration: 1.2 });
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
        <div style="position: relative; width: 42px; height: 50px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%); cursor: pointer;">
          <svg width="42" height="50" viewBox="0 0 42 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 0C9.402 0 0 9.402 0 21C0 34.5 21 50 21 50C21 50 42 34.5 42 21C42 9.402 32.598 0 21 0Z" 
                  fill="${isSelected ? '#0F766E' : '#115E59'}" 
                  stroke="#FFFFFF" 
                  stroke-width="2.5" 
                  filter="drop-shadow(0 4px 6px rgba(15, 118, 110, 0.35))"/>
            <circle cx="21" cy="19" r="13" fill="#FFFFFF"/>
            <text x="21" y="24" text-anchor="middle" fill="#0F766E" font-size="13" font-weight="bold" font-family="Vazirmatn, sans-serif">${countLabel}</text>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-loqme-pin',
        html: iconSvg,
        iconSize: [42, 50],
        iconAnchor: [21, 50],
      });

      const marker = L.marker([pin.latitude, pin.longitude], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setActivePin(pin);
        if (onSelectStore) onSelectStore(pin);
        map.flyTo([pin.latitude, pin.longitude], 15, { duration: 0.8 });
      });

      markersRef.current[pin.id] = marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, selectedStoreId, activePin?.id]);

  const handleRecenter = (coords: [number, number], zoomLevel = 14) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, zoomLevel, { duration: 1 });
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          mapInstanceRef.current?.flyTo(userCoords, 15, { duration: 1.2 });
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err);
        }
      );
    }
  };

  return (
    <div className={`relative w-full h-[480px] md:h-[580px] rounded-3xl overflow-hidden shadow-card border border-loqme-neutral-200 ${className}`}>
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating City & Quick Action Controls */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-dropdown border border-loqme-neutral-200 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRecenter([37.5342, 45.0681], 14)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-loqme-primary-700 bg-loqme-primary-50 hover:bg-loqme-primary-100 transition-colors flex items-center gap-1"
          >
            <span>📍 ارومیه (دانشکده)</span>
          </button>
          <button
            type="button"
            onClick={() => handleRecenter([35.7891, 51.3735], 13)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-loqme-neutral-600 hover:bg-loqme-neutral-100 transition-colors flex items-center gap-1"
          >
            <span>🏙️ تهران</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          title="موقعیت کنونی من"
          className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-dropdown border border-loqme-neutral-200 text-loqme-neutral-700 hover:text-loqme-primary-600 flex items-center justify-center transition-colors self-start"
        >
          🎯
        </button>
      </div>

      {/* Selected Store Bottom Drawer Preview */}
      {activePin && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/98 backdrop-blur-md rounded-2xl p-4 shadow-float border border-loqme-neutral-200 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-loqme-neutral-900">{activePin.businessNameFa}</h4>
                  <Badge variant="brand" size="sm">
                    ★ {toPersianDigits(activePin.ratingAverage.toFixed(1))}
                  </Badge>
                </div>
                <p className="text-xs text-loqme-neutral-500 line-clamp-1">{activePin.addressFa}</p>
              </div>

              <button
                type="button"
                onClick={() => setActivePin(null)}
                className="text-loqme-neutral-400 hover:text-loqme-neutral-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-loqme-neutral-100">
              <div className="text-xs">
                <span className="text-loqme-neutral-500">موجودی فعال: </span>
                <span className="font-bold text-loqme-primary-700">{toPersianDigits(activePin.activeListingCount)} بسته</span>
                {activePin.minPriceToman && (
                  <span className="text-loqme-neutral-400 mr-2">
                    (از {formatToman(activePin.minPriceToman)})
                  </span>
                )}
              </div>

              <Link href={`/merchants/${activePin.merchantId}`}>
                <Button size="sm" variant="primary">
                  مشاهده بسته‌ها
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
