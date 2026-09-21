'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { BusinessPlaceDto } from '@loqme/types';
const noPlaces: BusinessPlaceDto[] = [];

export default function StoreLocationMap({ latitude, longitude, editable = false, places = noPlaces, onChange, onSelect }: {
  latitude: number; longitude: number; editable?: boolean; places?: BusinessPlaceDto[];
  onChange?: (latitude: number, longitude: number) => void; onSelect?: (place: BusinessPlaceDto) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const callbacks = useRef({ onChange, onSelect }); callbacks.current = { onChange, onSelect };
  const [failed, setFailed] = useState(false);
  const initial = useRef({ latitude, longitude, editable });
  useEffect(() => {
    if (!container.current) return;
    const point = initial.current;
    const map = L.map(container.current, { center: [point.latitude, point.longitude], zoom: 14, scrollWheelZoom: false });
    mapRef.current = map;
    const key = process.env.NEXT_PUBLIC_MAP_API_KEY || '';
    const tiles = L.tileLayer(`https://map.ir/shiveh/xyz/1.0.0/Shiveh:Shiveh@EPSG:3857@png/{z}/{x}/{y}.png?x-api-key=${encodeURIComponent(key)}`, {
      attribution: '&copy; <a href="https://map.ir">Map.ir</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 20,
    }).addTo(map);
    tiles.on('tileerror', () => setFailed(true)); tiles.on('tileload', () => setFailed(false));
    layer.current = L.layerGroup().addTo(map);
    if (point.editable) map.on('click', (e: L.LeafletMouseEvent) => callbacks.current.onChange?.(e.latlng.lat, e.latlng.lng));
    const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => {
    const map = mapRef.current; const markers = layer.current;
    if (!map || !markers) return;
    markers.clearLayers();
    const icon = L.divIcon({ className: 'business-map-pin', html: '<span></span>', iconSize: [28, 36], iconAnchor: [14, 36] });
    if (places.length) {
      places.forEach(place => { L.marker([place.latitude, place.longitude], { icon, title: place.name, alt: place.name }).addTo(markers).on('click', () => callbacks.current.onSelect?.(place)); });
      map.fitBounds(L.latLngBounds(places.map(p => [p.latitude, p.longitude])), { padding: [32, 32], maxZoom: 15, animate: false });
    } else {
      const marker = L.marker([latitude, longitude], { icon, draggable: editable, title: 'موقعیت فروشگاه', alt: 'موقعیت فروشگاه' }).addTo(markers);
      marker.on('dragend', () => { const p = marker.getLatLng(); callbacks.current.onChange?.(p.lat, p.lng); });
      map.setView([latitude, longitude], map.getZoom(), { animate: false });
    }
  }, [latitude, longitude, editable, places]);
  return <div className="space-y-2"><div ref={container} className="business-map" role="region" aria-label="نقشه موقعیت فروشگاه" />{failed && <p className="text-xs text-loqme-neutral-600" role="status">تصویر نقشه بارگذاری نشد. می‌توانید از نتایج متنی یا فیلدهای مختصات استفاده کنید.</p>}</div>;
}
