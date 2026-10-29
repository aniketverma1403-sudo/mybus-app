'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { socket } from '@/utils/socket';

const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
type Position = { lat: number; lng: number };
type Stop = { stopName: string; latitude: number; longitude: number; orderIndex: number };
type Driver = { name: string; phone?: string; email?: string };
type Bus = { _id: string; busNumber: string; driverId?: Driver | null; routeId?: { routeName?: string; stops?: Stop[] } };
type Assignment = { bus: Bus; route?: { routeName?: string; stops?: Stop[] }; trip?: { _id: string; currentLocation?: { latitude: number; longitude: number }; updatedAt?: string; startedAt?: string } | null };
type Child = { _id: string; name: string; className: string; section?: string; admissionNumber?: string; pickupStop?: string; dropStop?: string; busId?: Bus | string | null; routeId?: { routeName?: string; stops?: Stop[] } | string | null };

export default function ParentMap() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('parent@school.com');
  const [password, setPassword] = useState('Demo@1234');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Sign in to view the bus assigned by your school.');
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState<Date | null>(null);

  const loadAssignment = useCallback(async (savedToken: string) => {
    const response = await fetch(`${API}/api/trips/parent-assignment`, { headers: { Authorization: `Bearer ${savedToken}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAssignment(null);
      setPosition(null);
      setStatus(data.message || 'Unable to load your school bus assignment.');
      return;
    }
    setAssignment(data);
    const location = data.trip?.currentLocation;
    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      setPosition({ lat: location.latitude, lng: location.longitude });
      setLastLocationAt(data.trip?.updatedAt ? new Date(data.trip.updatedAt) : new Date());
    } else {
      setLastLocationAt(null);
    }
    setStatus(data.trip ? 'Your assigned bus trip is active.' : 'Your assigned bus is not currently on an active trip.');
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('parentToken') || '';
    if (saved) {
      setToken(saved);
      void loadAssignment(saved);
    }
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onLocation = (location: { busId: string; latitude: number; longitude: number }) => {
      setPosition({ lat: location.latitude, lng: location.longitude });
      setLastLocationAt(new Date());
    };
    const onTrackingError = (error: { message?: string }) => setStatus(error.message || 'Tracking permission was denied.');
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bus-location', onLocation);
    socket.on('tracking-error', onTrackingError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bus-location', onLocation);
      socket.off('tracking-error', onTrackingError);
      socket.disconnect();
    };
  }, [loadAssignment]);

  useEffect(() => {
    if (!token || !assignment?.bus?._id || !assignment.trip) {
      socket.disconnect();
      return;
    }
    socket.auth = { token };
    socket.connect();
    const joinBusRoom = () => socket.emit('join-bus-room', assignment.bus._id);
    if (socket.connected) joinBusRoom(); else socket.once('connect', joinBusRoom);
    return () => {
      socket.emit('leave-bus-room', assignment.bus._id);
      socket.off('connect', joinBusRoom);
      socket.disconnect();
    };
  }, [token, assignment?.bus?._id, assignment?.trip?._id]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus('Signing in…');
    try {
      if (registering) {
        const registration = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: email.split('@')[0], email, password })
        });
        const registrationData = await registration.json().catch(() => ({}));
        if (!registration.ok) { setStatus(registrationData.message || 'Unable to create parent account.'); return; }
      }
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.user?.role !== 'parent') {
        setStatus(data.message || 'Use a parent account provided or registered for your school.');
        return;
      }
      localStorage.setItem('parentToken', data.token);
      setToken(data.token);
      setPassword('');
      await loadAssignment(data.token);
    } catch (_error) {
      setStatus('Cannot reach the backend. Check that the school tracking service is running.');
    } finally { setLoading(false); }
  }

  function signOut() {
    socket.disconnect();
    localStorage.removeItem('parentToken');
    setToken('');
    setAssignment(null);
    setPosition(null);
    setConnected(false);
    setStatus('You have signed out.');
  }

  const stops = assignment?.route?.stops || assignment?.bus?.routeId?.stops || [];
  const nextStop = [...stops].sort((a, b) => a.orderIndex - b.orderIndex)[0];
  const distanceKm = position && nextStop
    ? Math.round(distanceBetween(position.lat, position.lng, nextStop.latitude, nextStop.longitude) * 10) / 10
    : null;
  const etaMinutes = distanceKm !== null ? Math.ceil(distanceKm / 25 * 60) : null;
  const locationIsStale = lastLocationAt ? Date.now() - lastLocationAt.getTime() > 60_000 : Boolean(assignment?.trip);

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');

  return <main className="min-h-screen bg-slate-100">
    <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[350px_1fr] md:p-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="font-bold text-blue-600">SCHOOL BUS TRACKER</p>
        <div className="flex items-start justify-between gap-3"><h1 className="mt-2 text-3xl font-bold text-slate-900">Track your bus</h1>{token && <button onClick={signOut} className="mt-3 text-sm font-semibold text-slate-500 underline">Sign out</button>}</div>
        {!token ? <form onSubmit={login} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-600">Parent email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-slate-900" placeholder="you@example.com" /></label>
          <label className="block text-sm font-medium text-slate-600">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-slate-900" placeholder="Your password" /></label>
          <button disabled={loading} className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-60">{loading ? 'Please wait…' : registering ? 'Create parent account' : 'Sign in to track'}</button>
          <button type="button" onClick={() => setRegistering(value => !value)} className="w-full p-2 text-sm font-semibold text-blue-700 underline">{registering ? 'Already have an account? Sign in' : 'New parent? Create an account'}</button>
        </form> : <>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Your assigned bus</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{assignment?.bus?.busNumber || 'Loading assignment…'}</p>
            <p className="mt-1 text-sm text-slate-600">{assignment?.route?.routeName || assignment?.bus?.routeId?.routeName || 'Route not assigned'}</p>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned driver</p>
              <p className="mt-1 font-bold text-slate-900">{assignment?.bus?.driverId?.name || 'Not assigned'}</p>
              {assignment?.bus?.driverId?.phone && <a className="mt-1 block text-sm font-semibold text-blue-700" href={`tel:${assignment.bus.driverId.phone}`}>{assignment.bus.driverId.phone}</a>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4"><small className="text-slate-500">Distance to first stop</small><p className="text-2xl font-bold text-slate-900">{distanceKm === null ? '—' : `${distanceKm} km`}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><small className="text-slate-500">Estimated time</small><p className="text-2xl font-bold text-slate-900">{etaMinutes === null ? '—' : `${etaMinutes} min`}</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-sm text-slate-600"><p>{connected ? '🟢 Live connection established' : '⚪ Waiting for live updates'}</p><button onClick={() => void loadAssignment(token)} className="font-semibold text-blue-700 underline">Refresh</button></div>
          {assignment?.trip && !lastLocationAt && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Trip is active. Waiting for the driver's first GPS update.</p>}
          {locationIsStale && assignment?.trip && lastLocationAt && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">The bus location has not updated recently and may be out of date.</p>}
        </>}
        <p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{status}</p>
      </section>
      <section className="relative min-h-[520px] overflow-hidden rounded-3xl bg-slate-200 shadow-sm">
        <LiveMap position={position} />
      </section>
    </div>
  </main>;
}

function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
