'use client';
import { RippleButton } from "@/components/magicui/ripple-button";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Plus, Minus, LocateFixed, Check } from 'lucide-react';
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
  const syncing = useRef(false);
  const callbacks = useRef({ onChange, onSelect }); callbacks.current = { onChange, onSelect };
  const [failed, setFailed] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const initial = useRef({ latitude, longitude, editable });
  useEffect(() => {
    if (!container.current) return;
    const point = initial.current;
    const map = L.map(container.current, { center: [point.latitude, point.longitude], zoom: 16, scrollWheelZoom: false, zoomControl: false });
    mapRef.current = map;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    tiles.on('tileerror', () => setFailed(true));
    tiles.on('tileload', () => setFailed(false));
    layer.current = L.layerGroup().addTo(map);
    if (point.editable) map.on('movestart', () => { if (!syncing.current) setConfirmed(false); });
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
      if (!editable) L.marker([latitude, longitude], { icon, title: 'موقعیت فروشگاه', alt: 'موقعیت فروشگاه' }).addTo(markers);
      syncing.current = true;
      map.setView([latitude, longitude], map.getZoom(), { animate: false });
      syncing.current = false;
    }
  }, [latitude, longitude, editable, places]);
  function confirm() {
    mapRef.current?.stop();
    const center = mapRef.current?.getCenter();
    if (!center) return;
    if (center.lat < 24 || center.lat > 40 || center.lng < 44 || center.lng > 64) { setLocationError('موقعیت فروشگاه را در ایران انتخاب کنید'); return; }
    callbacks.current.onChange?.(Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6)));
    setConfirmed(true); setLocationError('');
  }
  function locate() {
    if (!navigator.geolocation) { setLocationError('موقعیت در دسترس نیست؛ نقشه را دستی جابه‌جا کنید'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 17, { animate: false });
      setLocationError('');
    }, () => setLocationError('دسترسی به موقعیت ممکن نشد؛ نقشه را دستی جابه‌جا کنید'), { timeout: 10000 });
  }
  return <div className="space-y-3">
    {editable && <p className="text-sm text-loqme-neutral-600">نقشه را حرکت دهید تا نشانگر روی ورودی فروشگاه قرار بگیرد</p>}
    <div className="business-map-shell">
      <div ref={container} className="business-map" role="region" aria-label="نقشه موقعیت فروشگاه" />
      {editable && <div className="business-map-center-pin" aria-hidden="true"><MapPin size={42} fill="currentColor"/><span/></div>}
      <div className="business-map-controls"><RippleButton type="button" aria-label="بزرگ‌نمایی نقشه" onClick={() => mapRef.current?.zoomIn()}><Plus size={18}/></RippleButton><RippleButton type="button" aria-label="کوچک‌نمایی نقشه" onClick={() => mapRef.current?.zoomOut()}><Minus size={18}/></RippleButton><RippleButton type="button" aria-label="موقعیت فعلی من" onClick={locate}><LocateFixed size={19}/></RippleButton></div>
    </div>
    {editable && <RippleButton type="button" className="business-map-confirm" onClick={confirm}><Check size={18}/>{confirmed ? 'موقعیت فروشگاه تأیید شد' : 'تأیید این موقعیت'}</RippleButton>}
    {locationError && <p role="alert" className="text-sm text-rose-700">{locationError}</p>}
    {failed && <p className="text-xs text-loqme-neutral-600" role="status">تصویر نقشه بارگذاری نشد؛ می‌توانید مختصات را دستی وارد کنید</p>}
  </div>;
}
