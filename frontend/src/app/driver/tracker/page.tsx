'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { socket } from '@/utils/socket';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
type Assignment = { bus?: { _id: string; busNumber: string }; route?: { _id: string; routeName: string; stops?: unknown[] } };

export default function DriverTracker() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignment, setAssignment] = useState<Assignment>({});
  const [tripId, setTripId] = useState('');
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('Sign in to load your assigned route.');
  const [gpsReady, setGpsReady] = useState(false);
  const watchId = useRef<number | null>(null);

  async function loadAssignment(savedToken: string) {
    const response = await fetch(`${API}/api/trips/assignment`, { headers: { Authorization: `Bearer ${savedToken}` } });
    const data = await response.json();
    if (!response.ok) { setStatus(data.message || 'Your account has no assigned bus yet.'); return; }
    setAssignment(data);
    setStatus(`Ready for ${data.route?.routeName || 'your route'}.`);
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('busToken') || '';
    setToken(savedToken);
    if (savedToken) loadAssignment(savedToken);
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); socket.disconnect(); };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus('Signing in…');
    const response = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok || data.user?.role !== 'driver') { setStatus(data.message || 'This account is not a driver account.'); return; }
    localStorage.setItem('busToken', data.token); setToken(data.token); setPassword(''); await loadAssignment(data.token);
  }

  async function startTrip() {
    let currentAssignment = assignment;
    const refresh = await fetch(`${API}/api/trips/assignment`, { headers: { Authorization: `Bearer ${token}` } });
    const refreshedAssignment = await refresh.json().catch(() => ({}));
    if (refresh.ok) {
      currentAssignment = refreshedAssignment;
      setAssignment(refreshedAssignment);
      setStatus(`Ready for ${refreshedAssignment.route?.routeName || 'your route'}.`);
    }
    if (!currentAssignment.bus || !currentAssignment.route) return setStatus(refresh.ok ? 'Bus assignment is missing. Ask the school administrator to assign both a bus and route.' : (refreshedAssignment.message || 'Unable to load your assignment. Please sign in again.'));
    const response = await fetch(`${API}/api/trips/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ busId: currentAssignment.bus._id, routeId: currentAssignment.route._id }) });
    const data = await response.json();
    if (!response.ok) return setStatus(data.message || 'Unable to start trip');
    setTripId(data._id); setActive(true); setGpsReady(true); socket.auth = { token }; socket.connect(); socket.emit('join-bus-room', currentAssignment.bus._id);
    watchId.current = navigator.geolocation.watchPosition((position) => {
      socket.emit('update-location', { tripId: data._id, busId: currentAssignment.bus?._id, latitude: position.coords.latitude, longitude: position.coords.longitude });
    }, () => setStatus('Location permission is required while driving.'), { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
    setStatus('Trip active — sharing live location.');
  }

  async function endTrip() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    socket.disconnect();
    try {
      const response = await fetch(`${API}/api/trips/${tripId}/end`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setStatus(data?.message || 'Unable to end trip. Please contact the administrator.'); return; }
      setActive(false); setGpsReady(false); setStatus('Trip completed safely.');
    } catch (_error) { setStatus('Network error while ending trip. GPS sharing has stopped on this device.'); }
  }

  return <main className="min-h-screen bg-[#111713] px-4 py-6 text-white">
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d7ff62]">School bus tracker</p><h1 className="mt-2 text-3xl font-black">Driver route</h1></div><span className={`h-3 w-3 rounded-full ${gpsReady ? 'bg-[#d7ff62]' : 'bg-red-400'}`} /></div>
      {!token ? <form onSubmit={login} className="mt-8 space-y-4 rounded-3xl bg-white p-5 text-slate-950">
        <h2 className="text-xl font-black">Sign in</h2><input required type="email" className="w-full rounded-xl border border-slate-300 p-4 text-slate-950 placeholder:text-slate-400" placeholder="Driver email" value={email} onChange={(e) => setEmail(e.target.value)} /><input required type="password" className="w-full rounded-xl border border-slate-300 p-4 text-slate-950 placeholder:text-slate-400" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /><button className="h-14 w-full rounded-xl bg-[#d7ff62] font-black text-slate-950">SIGN IN</button>
      </form> : <>
        <section className="mt-8 rounded-3xl bg-[#202a24] p-5"><div className="flex justify-between text-sm"><span className="text-white/60">Today's assignment</span><span className={gpsReady ? 'text-[#d7ff62]' : 'text-red-300'}>{gpsReady ? 'GPS ACTIVE' : 'GPS READY'}</span></div><p className="mt-5 text-sm text-white/60">Bus</p><p className="text-3xl font-black">{assignment.bus?.busNumber || 'Not assigned'}</p><p className="mt-5 text-sm text-white/60">Route</p><p className="text-xl font-bold">{assignment.route?.routeName || 'Contact administrator'}</p></section>
        {!active ? <button onClick={startTrip} className="mt-5 h-24 w-full rounded-3xl bg-[#d7ff62] text-2xl font-black text-[#111713]">START TRIP</button> : <button onClick={endTrip} className="mt-5 h-24 w-full rounded-3xl bg-[#ff7051] text-2xl font-black text-white">END TRIP</button>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button className="rounded-2xl bg-[#202a24] p-5 font-bold">Report delay</button><button className="rounded-2xl bg-red-500 p-5 font-bold">SOS emergency</button></div>
      </>}
      <p className="mt-5 rounded-xl bg-white/10 p-4 text-center text-sm text-white/80">{status}</p>
    </div>
  </main>;
}
