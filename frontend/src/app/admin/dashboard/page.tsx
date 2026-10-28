'use client';
import { FormEvent, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
type Overview = { buses: number; routes: number; activeTrips: number };
type Bus = { _id: string; busNumber: string; licensePlate: string; capacity: number; studentCount: number; driverId?: string | { _id: string; name: string }; routeId?: string | { _id: string; routeName: string } };
type Route = { _id: string; routeName: string; schoolId: string; stops?: unknown[] };
type Driver = { _id: string; name: string; email: string; assignedBusId?: string };
type Parent = { _id: string; name: string; email: string; assignedBusId?: string };

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@school.com');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<Overview>({ buses: 0, routes: 0, activeTrips: 0 });
  const [busNumber, setBusNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [studentCount, setStudentCount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [parentId, setParentId] = useState('');
  const [parentBusId, setParentBusId] = useState('');
  const [assignmentDriverId, setAssignmentDriverId] = useState('');
  const [assignmentBusId, setAssignmentBusId] = useState('');
  const [assignmentRouteId, setAssignmentRouteId] = useState('');
  const [fleetOpen, setFleetOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [routeName, setRouteName] = useState('');
  const [schoolId, setSchoolId] = useState('school-demo');
  const [editingBusId, setEditingBusId] = useState('');

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok || data.user?.role !== 'admin') { setMessage(data.message || 'This account does not have administrator access.'); return; }
    localStorage.setItem('adminToken', data.token); setToken(data.token); setPassword(''); setMessage(`Welcome, ${data.user.name}. Admin session started.`); await load(data.token); await loadFleet(data.token);
  }

  async function load(tokenValue = token) {
    if (!tokenValue) return;
    const response = await fetch(`${API}/api/admin/overview`, { headers: { Authorization: `Bearer ${tokenValue}` } });
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('adminToken');
      setToken('');
      setMessage('This saved session is not an administrator session. Please sign in again.');
      return;
    }
    if (response.ok) setOverview(await response.json());
  }

  async function loadFleet(tokenValue = token) {
    if (!tokenValue) return;
    const headers = { Authorization: `Bearer ${tokenValue}` };
    const [busResponse, routeResponse, driverResponse, parentResponse] = await Promise.all([
      fetch(`${API}/api/admin/buses`, { headers }),
      fetch(`${API}/api/admin/routes`, { headers }),
      fetch(`${API}/api/admin/drivers`, { headers }),
      fetch(`${API}/api/admin/parents`, { headers })
    ]);
    if (busResponse.ok) setBuses(await busResponse.json());
    if (routeResponse.ok) setRoutes(await routeResponse.json());
    if (driverResponse.ok) setDrivers(await driverResponse.json());
    if (parentResponse.ok) setParents(await parentResponse.json());
  }

  function signOut() {
    localStorage.removeItem('adminToken');
    setToken('');
    setOverview({ buses: 0, routes: 0, activeTrips: 0 });
    setMessage('Signed out.');
  }

  useEffect(() => {
    const saved = localStorage.getItem('adminToken') || '';
    setToken(saved);
    if (saved) { load(saved); loadFleet(saved); }
  }, []);

  async function addBus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    if (!token) { setMessage('Please sign in with an administrator account first.'); setLoading(false); return; }
    if (!busNumber.trim() || !licensePlate.trim() || !capacity || Number(capacity) < 1) {
      setMessage('Enter a bus number, license plate, and seating capacity of at least 1.'); setLoading(false); return;
    }

    try {
      const response = await fetch(`${API}/api/admin/buses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ busNumber: busNumber.trim(), licensePlate: licensePlate.trim(), capacity: Number(capacity), studentCount: Number(studentCount || 0) })
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken'); setToken('');
        setMessage('Your session is no longer authorized for the administrator dashboard. Please sign in again.'); return;
      }
      if (!response.ok) { setMessage(data?.message || `Unable to add bus (${response.status}).`); return; }
      setMessage(`Bus ${data.busNumber} added successfully.`);
      setBusNumber(''); setLicensePlate(''); setStudentCount(''); await load(data.token || token); await loadFleet(token);
    } catch (_error) { setMessage('Cannot reach the backend. Confirm http://localhost:5001 is running.'); }
    finally { setLoading(false); }
  }

  async function createDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${API}/api/admin/drivers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: driverName, email: driverEmail, password: driverPassword }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.message || 'Unable to create driver.');
    setMessage(`Driver ${data.name} created.`); setDriverName(''); setDriverEmail(''); setDriverPassword(''); await loadFleet();
  }

  async function createRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${API}/api/admin/routes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ routeName: routeName, schoolId, stops: [] }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.message || 'Unable to create route.');
    setMessage(`Route ${data.routeName} created.`); setRouteName(''); await loadFleet();
  }

  async function assignDriver(driverId: string, busId: string, routeId: string) {
    if (!busId || !routeId) return setMessage('Select both a bus and a route.');
    const response = await fetch(`${API}/api/admin/drivers/${driverId}/assignment`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ busId, routeId }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.message || 'Unable to assign driver.');
    setMessage('Driver, bus, and route assigned successfully.'); await loadFleet();
  }

  async function assignParent() {
    if (!parentId || !parentBusId) return setMessage('Select both a parent and a bus.');
    const response = await fetch(`${API}/api/admin/parents/${parentId}/assignment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ busId: parentBusId })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.message || 'Unable to assign a bus to this parent.');
    setMessage('Parent assigned to bus successfully.');
    await loadFleet();
  }

  function startEditBus(bus: Bus) {
    setEditingBusId(bus._id); setBusNumber(bus.busNumber); setLicensePlate(bus.licensePlate);
    setCapacity(String(bus.capacity)); setStudentCount(String(bus.studentCount));
  }

  function cancelEditBus() {
    setEditingBusId(''); setBusNumber(''); setLicensePlate(''); setCapacity('40'); setStudentCount('');
  }

  async function updateBus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${API}/api/admin/buses/${editingBusId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ busNumber: busNumber.trim(), licensePlate: licensePlate.trim(), capacity: Number(capacity), studentCount: Number(studentCount || 0) }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setMessage(data?.message || 'Unable to update bus.');
    setMessage(`Bus ${data.busNumber} updated.`); cancelEditBus(); await loadFleet(); await load();
  }

  async function deleteBus(busId: string, busLabel: string) {
    if (!window.confirm(`Delete bus ${busLabel}? This will also remove its driver assignment.`)) return;
    const response = await fetch(`${API}/api/admin/buses/${busId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok && response.status !== 204) { const data = await response.json().catch(() => null); return setMessage(data?.message || 'Unable to delete bus.'); }
    setMessage(`Bus ${busLabel} deleted.`); await loadFleet(); await load();
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return <main className="min-h-screen bg-[#f4f3ee] p-4 text-slate-950 md:p-8">
    <div className="mx-auto max-w-6xl">
      <header className="rounded-3xl bg-[#18201d] p-7 text-white md:p-10"><p className="font-bold uppercase tracking-[0.2em] text-[#d7ff62]">Admin control center</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Fleet overview</h1><p className="mt-3 text-slate-300">Register vehicles and monitor active school routes.</p></header>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Administrator sign in</h2>{!token ? <form onSubmit={login} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input required type="email" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" /><input required type="password" className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><button className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">Sign in</button></form> : <div className="mt-3 flex items-center justify-between gap-3"><p className="font-semibold text-emerald-700">Administrator session active</p><div className="flex gap-2"><button onClick={() => load()} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Refresh</button><button onClick={signOut} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Sign out</button></div></div>}</section>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{Object.entries(overview).map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-6 shadow-sm"><p className="capitalize text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p><strong className="text-5xl">{value}</strong></div>)}</div>
      <form onSubmit={editingBusId ? updateBus : addBus} className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{editingBusId ? 'Edit bus' : 'Register a bus'}</h2>{editingBusId && <button type="button" onClick={cancelEditBus} className="rounded-xl border px-4 py-2 font-bold">Cancel edit</button>}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="font-semibold text-slate-700">Bus number<input required className={inputClass} value={busNumber} onChange={(e) => setBusNumber(e.target.value)} placeholder="Example: SB-12" /></label>
          <label className="font-semibold text-slate-700">License plate<input required className={inputClass} value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="Example: KA01AB1234" /></label>
          <label className="font-semibold text-slate-700">Seating capacity<input required type="number" min="1" className={inputClass} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label>
          <label className="font-semibold text-slate-700">Student count<input required type="number" min="0" className={inputClass} value={studentCount} onChange={(e) => setStudentCount(e.target.value)} placeholder="Number of assigned students" /></label>
        </div>
        <button disabled={loading} className="mt-5 w-full rounded-xl bg-[#18201d] px-6 py-4 font-bold text-white disabled:opacity-50 md:w-auto">{editingBusId ? 'Save changes' : loading ? 'Adding bus…' : 'Add bus'}</button>
        {message && <p role="alert" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">{message}</p>}
      </form>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black">Fleet, drivers & routes</h2><p className="mt-1 text-sm text-slate-500">View buses and bind each driver to a bus and route.</p></div><button onClick={() => loadFleet()} className="rounded-xl border px-4 py-2 font-bold">Refresh</button></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <form onSubmit={createDriver} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Create driver account</h3><div className="mt-3 grid gap-3"><input required className={inputClass} placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} /><input required type="email" className={inputClass} placeholder="Driver email" value={driverEmail} onChange={e => setDriverEmail(e.target.value)} /><input required minLength={8} type="password" className={inputClass} placeholder="Password (8+ characters)" value={driverPassword} onChange={e => setDriverPassword(e.target.value)} /><button className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Create driver</button></div></form>
          <form onSubmit={createRoute} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Create route</h3><div className="mt-3 grid gap-3"><input required className={inputClass} placeholder="Route name, e.g. Route A" value={routeName} onChange={e => setRouteName(e.target.value)} /><input required className={inputClass} placeholder="School ID" value={schoolId} onChange={e => setSchoolId(e.target.value)} /><button className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Create route</button></div></form>
        </div>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="font-black">Assign bus to parent</h3>
          <p className="mt-1 text-sm text-slate-600">Parents will only be able to track the bus assigned to their account.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="font-semibold">Parent account<select className={inputClass} value={parentId} onChange={e => setParentId(e.target.value)}><option value="">Select parent</option>{parents.map(parent => <option key={parent._id} value={parent._id}>{parent.name} ({parent.email})</option>)}</select></label>
            <label className="font-semibold">Assigned bus<select className={inputClass} value={parentBusId} onChange={e => setParentBusId(e.target.value)}><option value="">Select bus</option>{buses.map(bus => <option key={bus._id} value={bus._id}>{bus.busNumber} — {bus.licensePlate}</option>)}</select></label>
            <button type="button" onClick={assignParent} className="self-end rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Assign parent</button>
          </div>
          {parents.length === 0 && <p className="mt-3 text-sm text-slate-600">No parent accounts found yet. Parents must register before assignment.</p>}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <label className="font-semibold">Driver<select className={inputClass} value={assignmentDriverId} onChange={e => setAssignmentDriverId(e.target.value)}><option value="">Select driver</option>{drivers.map(driver => <option key={driver._id} value={driver._id}>{driver.name}</option>)}</select></label>
          <label className="font-semibold">Bus<select className={inputClass} value={assignmentBusId} onChange={e => setAssignmentBusId(e.target.value)}><option value="">Select bus</option>{buses.map(bus => <option key={bus._id} value={bus._id}>{bus.busNumber} — {bus.licensePlate}</option>)}</select></label>
          <label className="font-semibold">Route<select className={inputClass} value={assignmentRouteId} onChange={e => setAssignmentRouteId(e.target.value)}><option value="">Select route</option>{routes.map(route => <option key={route._id} value={route._id}>{route.routeName}</option>)}</select></label>
        </div>
        <button onClick={() => assignDriver(assignmentDriverId, assignmentBusId, assignmentRouteId)} className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">Assign driver to bus and route</button>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-180 text-left">
            <thead className="text-sm text-slate-500"><tr><th className="p-3">Bus</th><th className="p-3">Registration</th><th className="p-3">Capacity</th><th className="p-3">Students</th><th className="p-3">Assigned driver</th><th className="p-3">Route</th><th className="p-3">Actions</th></tr></thead>
            <tbody>{buses.map(bus => <tr key={bus._id} className="border-t">
              <td className="p-3 font-bold">{bus.busNumber}</td><td className="p-3">{bus.licensePlate}</td><td className="p-3">{bus.capacity}</td><td className="p-3">{bus.studentCount}</td>
              <td className="p-3">{typeof bus.driverId === 'object' ? bus.driverId?.name : drivers.find(d => d._id === bus.driverId)?.name || 'Unassigned'}</td>
              <td className="p-3">{typeof bus.routeId === 'object' ? bus.routeId?.routeName : routes.find(r => r._id === bus.routeId)?.routeName || 'Unassigned'}</td>
              <td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => startEditBus(bus)} className="rounded-lg bg-blue-100 px-3 py-2 font-bold text-blue-800">Edit</button><button type="button" onClick={() => deleteBus(bus._id, bus.busNumber)} className="rounded-lg bg-red-100 px-3 py-2 font-bold text-red-700">Delete</button></div></td>
            </tr>)}</tbody>
          </table>
          {buses.length === 0 && <p className="p-5 text-center text-slate-500">No buses have been registered yet.</p>}
        </div>
      </section>
    </div>
  </main>;
}
