'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';

const busIcon = L.divIcon({
  className: '',
  html: '<div style="display:grid;width:38px;height:38px;place-items:center;border-radius:50%;background:#2563eb;color:white;border:3px solid white;font-size:20px;box-shadow:0 3px 12px rgba(0,0,0,.35)">🚌</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19]
});

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 14));
  }, [map, position]);
  return null;
}

export default function LiveMap({ position }: { position: { lat: number; lng: number } | null }) {
  return (
    <MapContainer
      center={position ? [position.lat, position.lng] : [22.9734, 78.6569]}
      zoom={position ? 14 : 5}
      className="h-full min-h-[520px] w-full"
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {position && (
        <>
          <RecenterMap position={[position.lat, position.lng]} />
          <Marker position={[position.lat, position.lng]} icon={busIcon} />
        </>
      )}
    </MapContainer>
  );
}
