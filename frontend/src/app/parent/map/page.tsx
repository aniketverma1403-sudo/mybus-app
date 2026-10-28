'use client';

import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { socket } from '@/utils/socket';

function AnimatedMarker({ position }: { position: google.maps.LatLngLiteral }) {
  const map = useMap();
  useEffect(() => { map?.panTo(position); }, [map, position]);
  return <AdvancedMarker position={position} title="School bus" />;
}

export default function ParentMap() {
  const [busId, setBusId] = useState('');
  const [position, setPosition] = useState({ lat: 0, lng: 0 });
  const [stop, setStop] = useState({ lat: 0, lng: 0 });
  const [connected, setConnected] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    function receiveLocation(location: { latitude: number; longitude: number }) {
      setPosition({ lat: location.latitude, lng: location.longitude });
    }
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('bus-location', receiveLocation);
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('bus-location', receiveLocation); socket.disconnect(); };
  }, []);

  function trackBus() {
    if (!busId) return;
    socket.connect();
    socket.emit('join-bus-room', busId);
  }

  const distanceKm = position.lat && stop.lat ? Math.round(googleDistance(position.lat, position.lng, stop.lat, stop.lng) * 10) / 10 : 0;
  const etaMinutes = Math.ceil(distanceKm / 30 * 60);
  const approaching = distanceKm > 0 && distanceKm <= 2;

  return <main className="min-h-screen bg-slate-100">
    <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[350px_1fr] md:p-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="font-bold text-blue-600">LIVE BUS TRACKER</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Track your bus</h1>
        <label className="mt-6 block text-sm font-medium text-slate-600">Bus ID</label>
        <input value={busId} onChange={(e) => setBusId(e.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="Enter bus ID" />
        <button onClick={trackBus} className="mt-3 w-full rounded-xl bg-blue-600 p-3 font-bold text-white">Start tracking</button>
        <label className="mt-6 block text-sm font-medium text-slate-600">Stop latitude, longitude</label>
        <div className="mt-2 grid grid-cols-2 gap-2"><input type="number" className="rounded-xl border p-3" onChange={(e) => setStop((s) => ({ ...s, lat: Number(e.target.value) }))} /><input type="number" className="rounded-xl border p-3" onChange={(e) => setStop((s) => ({ ...s, lng: Number(e.target.value) }))} /></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><small className="text-slate-500">Distance</small><p className="text-2xl font-bold">{distanceKm || '—'} km</p></div><div className="rounded-2xl bg-slate-50 p-4"><small className="text-slate-500">ETA</small><p className="text-2xl font-bold">{distanceKm ? `${etaMinutes} min` : '—'}</p></div></div>
        <p className="mt-4 text-sm text-slate-500">{connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      </section>
      <section className="relative min-h-[520px] overflow-hidden rounded-3xl bg-slate-200 shadow-sm">
        {approaching && <div className="absolute left-4 right-4 top-4 z-10 rounded-xl bg-amber-400 p-4 text-center font-bold text-slate-950">The bus is within 2 km of your stop!</div>}
        {key ? <APIProvider apiKey={key}><Map defaultCenter={{ lat: position.lat || 17.385, lng: position.lng || 78.4867 }} defaultZoom={14} mapId="school-bus-tracker" gestureHandling="greedy">{position.lat !== 0 && <AnimatedMarker position={position} />}</Map></APIProvider> : <div className="flex h-full min-h-[520px] items-center justify-center p-8 text-center font-medium text-slate-600">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to frontend/.env.local</div>}
      </section>
    </div>
  </main>;
}

function googleDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
