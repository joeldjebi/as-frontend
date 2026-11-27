import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { isDark } from './core';

/** Carte pour placer le point de livraison (clic ou position du téléphone) */
export default function MapPicker({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (p: { lat: number; lng: number }) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(value ? [value.lat, value.lng] : [5.345, -4.02], value ? 16 : 12);
    const dark = isDark();
    L.tileLayer(dark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: dark ? '© OpenStreetMap, © CARTO' : '© OpenStreetMap',
    }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !value) return;
    if (!marker.current) marker.current = L.circleMarker([value.lat, value.lng], { radius: 11, color: '#fff', weight: 3, fillColor: '#0B6B4F', fillOpacity: 1 }).addTo(m);
    else marker.current.setLatLng([value.lat, value.lng]);
    // Point choisi dans la liste (ou position) : la carte s'y centre
    if (m.getZoom() < 15) m.setView([value.lat, value.lng], 16);
    else if (!m.getBounds().contains([value.lat, value.lng])) m.panTo([value.lat, value.lng]);
  }, [value]);

  return <div ref={el} className="map" />;
}
