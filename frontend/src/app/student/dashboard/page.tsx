'use client';

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '@/utils/socket';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
type Position = { lat: number; lng: number };
type Assignment = {
  student?: { name: string; className?: string; section?: string };
  bus?: { _id: string; busNumber: string };
  route?: { routeName: string };
  trip?: { _id: string; currentLocation?: { latitude: number; longitude: number }; updatedAt?: string } | null;
};

export default function StudentDashboard() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [message, setMessage] = useState('Sign in to view your assigned school bus.');
  const [loading, setLoading] = useState(false);
  const assignedBusId = useRef<string | null>(null);
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const loadAssignment = useCallback(async (savedToken: string) => {
    try {
      const response = await fetch(`${API}/api/trips/student-assignment`, { headers: { Authorization: `Bearer ${savedToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        assignedBusId.current = null;
        setAssignment(null);
        setPosition(null);
        setMessage(data.message || 'Unable to load your bus assignment.');
        return;
      }
      assignedBusId.current = data.bus?._id ? String(data.bus._id) : null;
      setAssignment(data);
      const location = data.trip?.currentLocation;
      if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
        setPosition({ lat: location.latitude, lng: location.longitude });
        setLastUpdate(data.trip?.updatedAt ? new Date(data.trip.updatedAt) : new Date());
      } else {
        setPosition(null);
        setLastUpdate(null);
      }
      setMessage(data.trip ? 'Your bus is on an active trip.' : 'Your bus is not currently on an active trip.');
    } catch (_error) {
      setMessage('Cannot reach the school tracking service. Try again shortly.');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('studentToken') || '';
    if (saved) {
      setToken(saved);
      void loadAssignment(saved);
    }
    const onLocation = (location: { busId: string; latitude: number; longitude: number; timestamp?: number }) => {
      if (!assignedBusId.current || String(location.busId) !== assignedBusId.current) return;
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
      setPosition({ lat: location.latitude, lng: location.longitude });
      setLastUpdate(location.timestamp ? new Date(location.timestamp) : new Date());
    };
    const onTrackingError = (error: { message?: string }) => setMessage(error.message || 'Live tracking is temporarily unavailable.');
    socket.on('bus-location', onLocation);
    socket.on('tracking-error', onTrackingError);
    return () => {
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
    socket.emit('join-bus-room', assignment.bus._id);
    return () => {
      socket.emit('leave-bus-room', assignment.bus?._id);
      socket.disconnect();
    };
  }, [token, assignment?.bus?._id, assignment?.trip?._id]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('Signing in…');
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.user?.role !== 'student') {
        setMessage(data.message || 'This account is not a student account.');
        return;
      }
      localStorage.setItem('studentToken', data.token);
      setToken(data.token);
      setPassword('');
      await loadAssignment(data.token);
    } catch (_error) {
      setMessage('Cannot reach the backend. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    socket.disconnect();
    localStorage.removeItem('studentToken');
    assignedBusId.current = null;
    setToken('');
    setAssignment(null);
    setPosition(null);
    setMessage('You have signed out.');
  }

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[#18201d] p-6 text-white md:p-8">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7ff62]">MyBus · Student</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Your school bus</h1><p className="mt-2 text-white/70">View your assigned bus and live trip status.</p></div>
        {token && <button onClick={signOut} className="rounded-xl border border-white/30 px-4 py-2 font-bold">Sign out</button>}
      </header>
      {!token ? <form onSubmit={login} className="mt-5 max-w-xl rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Student sign in</h2>
        <label className="mt-4 block text-sm font-semibold">Student email<input required type="email" autoComplete="username" className="mt-2 w-full rounded-xl border p-3" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="mt-3 block text-sm font-semibold">Password<input required type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border p-3" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={loading} className="mt-4 w-full rounded-xl bg-slate-900 p-3 font-bold text-white disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form> : <div className="mt-5 grid gap-5 md:grid-cols-[340px_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Student</p><h2 className="mt-1 text-2xl font-black">{assignment?.student?.name || 'Loading…'}</h2>
          <p className="mt-1 text-sm text-slate-600">{[assignment?.student?.className, assignment?.student?.section ? `Section ${assignment.student.section}` : ''].filter(Boolean).join(' · ')}</p>
          <div className="mt-6 border-t pt-5"><p className="text-sm text-slate-500">Assigned bus</p><p className="mt-1 text-3xl font-black">{assignment?.bus?.busNumber || 'Not assigned'}</p><p className="mt-3 text-sm text-slate-500">Route</p><p className="mt-1 font-bold">{assignment?.route?.routeName || 'Contact school admin'}</p></div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="font-bold">{assignment?.trip ? 'Trip in progress' : 'No active trip'}</p><p className="mt-1 text-sm text-slate-600">{lastUpdate ? `Last GPS update: ${lastUpdate.toLocaleTimeString()}` : 'The bus location will appear when the driver starts the trip and shares GPS.'}</p></div>
          <p role="status" className="mt-4 text-sm text-slate-600">{message}</p>
        </section>
        <section className="min-h-[420px] overflow-hidden rounded-3xl bg-white p-2 shadow-sm">
          {mapKey && position ? <APIProvider apiKey={mapKey}><Map defaultCenter={position} center={position} defaultZoom={14} mapId="mybus-student-map" className="h-[420px] w-full rounded-2xl"><AdvancedMarker position={position} title="Your assigned school bus" /></Map></APIProvider> : <div className="flex h-[420px] items-center justify-center rounded-2xl bg-slate-100 p-8 text-center text-slate-500">{!mapKey ? 'The school map is not configured yet.' : 'Waiting for the driver’s first GPS location…'}</div>}
        </section>
      </div>}
    </div>
  </main>;
}
