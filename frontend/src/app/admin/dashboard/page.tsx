'use client';
import { FormEvent, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
type Overview = { buses: number; routes: number; activeTrips: number };
type Bus = { _id: string; busNumber: string; licensePlate: string; capacity: number; studentCount: number; driverId?: string | { _id: string; name: string }; routeId?: string | { _id: string; routeName: string } };
type Route = { _id: string; routeName: string; schoolId: string; stops?: unknown[] };
type Driver = { _id: string; name: string; email: string; assignedBusId?: string };
type Parent = { _id: string; name: string; email: string; assignedBusId?: string };
type Student = { _id: string; name: string; email: string; className?: string; section?: string; guardianUserId?: { name?: string; email?: string }; assignedBusId?: { busNumber?: string } };
type Incident = { _id: string; type: 'delay' | 'sos' | 'breakdown'; message: string; status: 'open' | 'acknowledged' | 'resolved'; createdAt: string; busId?: { busNumber?: string }; driverId?: { name?: string; phone?: string }; routeId?: { routeName?: string } };

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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parentId, setParentId] = useState('');
  const [parentBusId, setParentBusId] = useState('');
  const [assignmentDriverId, setAssignmentDriverId] = useState('');
  const [assignmentBusId, setAssignmentBusId] = useState('');
  const [assignmentRouteId, setAssignmentRouteId] = useState('');
  const [fleetOpen, setFleetOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [studentGuardianId, setStudentGuardianId] = useState('');
  const [studentBusId, setStudentBusId] = useState('');
  const [routeName, setRouteName] = useState('');
  const [routeStopsText, setRouteStopsText] = useState('Main Gate, 31.1048, 77.1734');
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
    const [busResponse, routeResponse, driverResponse, parentResponse, incidentResponse, studentResponse] = await Promise.all([
      fetch(`${API}/api/admin/buses`, { headers }),
      fetch(`${API}/api/admin/routes`, { headers }),
      fetch(`${API}/api/admin/drivers`, { headers }),
      fetch(`${API}/api/admin/parents`, { headers }),
      fetch(`${API}/api/incidents/admin`, { headers }),
      fetch(`${API}/api/admin/students`, { headers })
    ]);
    if (busResponse.ok) setBuses(await busResponse.json());
    if (routeResponse.ok) setRoutes(await routeResponse.json());
    if (driverResponse.ok) setDrivers(await driverResponse.json());
    if (parentResponse.ok) setParents(await parentResponse.json());
    if (incidentResponse.ok) setIncidents(await incidentResponse.json());
    if (studentResponse.ok) setStudents(await studentResponse.json());
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

  async function createParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch(`${API}/api/admin/parents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: parentName, email: parentEmail, password: parentPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(data.message || 'Unable to create parent account.');
      setMessage(`Parent account created for ${data.name}. Share the credentials securely and ask them to change the password when that feature is available.`);
      setParentName(''); setParentEmail(''); setParentPassword('');
      await loadFleet();
    } catch (_error) {
      setMessage('Cannot reach the backend to create the parent account.');
    }
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentGuardianId || !studentBusId) return setMessage('Select the student’s parent and bus.');
    try {
      const response = await fetch(`${API}/api/admin/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: studentName, email: studentEmail, password: studentPassword, className: studentClass, section: studentSection, guardianId: studentGuardianId, busId: studentBusId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(data.message || 'Unable to create student account.');
      setMessage(`Student account created for ${data.name}.`);
      setStudentName(''); setStudentEmail(''); setStudentPassword(''); setStudentClass(''); setStudentSection('');
      await loadFleet();
    } catch (_error) {
      setMessage('Cannot reach the backend to create the student account.');
    }
  }

  async function createRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lines = routeStopsText.split('\n').map(line => line.trim()).filter(Boolean);
    const stops = [];
    for (const [index, line] of lines.entries()) {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length !== 3 || !parts[0]) {
        setMessage(`Stop line ${index + 1} must be: Stop name, latitude, longitude.`);
        return;
      }
      const latitude = Number(parts[1]);
      const longitude = Number(parts[2]);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setMessage(`Stop line ${index + 1} has invalid coordinates.`);
        return;
      }
      stops.push({ stopName: parts[0], latitude, longitude, orderIndex: index });
    }
    if (stops.length === 0) return setMessage('Add at least one route stop with coordinates.');
    try {
      const response = await fetch(`${API}/api/admin/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ routeName: routeName.trim(), stops })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) return setMessage(data?.message || 'Unable to create route.');
      setMessage(`Route ${data.routeName} created with ${stops.length} stop(s).`);
      setRouteName('');
      await loadFleet();
    } catch (_error) {
      setMessage('Cannot reach the backend. Check the server and try again.');
    }
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

  async function updateIncidentStatus(incidentId: string, status: 'acknowledged' | 'resolved') {
    try {
      const response = await fetch(`${API}/api/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(data.message || 'Unable to update incident status.');
      setMessage(`Incident marked ${status}.`);
      await loadFleet();
    } catch (_error) {
      setMessage('Cannot reach the backend to update the incident.');
    }
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
        <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <form onSubmit={createDriver} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Create driver account</h3><div className="mt-3 grid gap-3"><input required className={inputClass} placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} /><input required type="email" className={inputClass} placeholder="Driver email" value={driverEmail} onChange={e => setDriverEmail(e.target.value)} /><input required minLength={8} type="password" className={inputClass} placeholder="Password (8+ characters)" value={driverPassword} onChange={e => setDriverPassword(e.target.value)} /><button className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Create driver</button></div></form>
          <form onSubmit={createParent} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Create parent account</h3><p className="mt-1 text-sm text-slate-600">Creates a parent account under this school.</p><div className="mt-3 grid gap-3"><input required className={inputClass} placeholder="Parent name" value={parentName} onChange={e => setParentName(e.target.value)} /><input required type="email" className={inputClass} placeholder="Parent email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} /><input required minLength={8} type="password" className={inputClass} placeholder="Temporary password (8+ characters)" value={parentPassword} onChange={e => setParentPassword(e.target.value)} /><button className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Create parent</button></div></form>
          <form onSubmit={createStudent} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Create student account</h3><p className="mt-1 text-sm text-slate-600">Links a student to a verified school parent and assigned bus.</p><div className="mt-3 grid gap-3"><input required className={inputClass} placeholder="Student name" value={studentName} onChange={e => setStudentName(e.target.value)} /><input required type="email" className={inputClass} placeholder="Student login email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} /><input required minLength={8} type="password" className={inputClass} placeholder="Temporary password (8+ characters)" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} /><input required className={inputClass} placeholder="Class / grade" value={studentClass} onChange={e => setStudentClass(e.target.value)} /><input className={inputClass} placeholder="Section (optional)" value={studentSection} onChange={e => setStudentSection(e.target.value)} /><select required className={inputClass} value={studentGuardianId} onChange={e => setStudentGuardianId(e.target.value)}><option value="">Select parent / guardian</option>{parents.map(parent => <option key={parent._id} value={parent._id}>{parent.name} ({parent.email})</option>)}</select><select required className={inputClass} value={studentBusId} onChange={e => setStudentBusId(e.target.value)}><option value="">Select assigned bus</option>{buses.map(bus => <option key={bus._id} value={bus._id}>{bus.busNumber}</option>)}</select><button className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Create student</button></div></form>
          <form onSubmit={createRoute} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-black">Create route with stops</h3><p className="mt-1 text-sm text-slate-600">Add one stop per line in this format: name, latitude, longitude. Stops stay in the order entered.</p><div className="mt-3 grid gap-3"><input required className={inputClass} placeholder="Route name, e.g. Route A" value={routeName} onChange={e => setRouteName(e.target.value)} /><textarea required rows={4} className={inputClass} placeholder={'School Gate, 31.1048, 77.1734\nMarket, 31.1080, 77.1800'} value={routeStopsText} onChange={e => setRouteStopsText(e.target.value)} /><button className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">Create route and stops</button></div></form>
        </div>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="font-black">Assign bus to parent</h3>
          <p className="mt-1 text-sm text-slate-600">Parents will only be able to track the bus assigned to their account.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="font-semibold">Parent account<select className={inputClass} value={parentId} onChange={e => setParentId(e.target.value)}><option value="">Select parent</option>{parents.map(parent => <option key={parent._id} value={parent._id}>{parent.name} ({parent.email})</option>)}</select></label>
            <label className="font-semibold">Assigned bus<select className={inputClass} value={parentBusId} onChange={e => setParentBusId(e.target.value)}><option value="">Select bus</option>{buses.map(bus => <option key={bus._id} value={bus._id}>{bus.busNumber} — {bus.licensePlate}</option>)}</select></label>
            <button type="button" onClick={assignParent} className="self-end rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Assign parent</button>
          </div>
          {parents.length === 0 && <p className="mt-3 text-sm text-slate-600">No parent accounts found for this school. Create a parent account above before assigning a bus.</p>}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <label className="font-semibold">Driver<select className={inputClass} value={assignmentDriverId} onChange={e => setAssignmentDriverId(e.target.value)}><option value="">Select driver</option>{drivers.map(driver => <option key={driver._id} value={driver._id}>{driver.name}</option>)}</select></label>
          <label className="font-semibold">Bus<select className={inputClass} value={assignmentBusId} onChange={e => setAssignmentBusId(e.target.value)}><option value="">Select bus</option>{buses.map(bus => <option key={bus._id} value={bus._id}>{bus.busNumber} — {bus.licensePlate}</option>)}</select></label>
          <label className="font-semibold">Route<select className={inputClass} value={assignmentRouteId} onChange={e => setAssignmentRouteId(e.target.value)}><option value="">Select route</option>{routes.map(route => <option key={route._id} value={route._id}>{route.routeName}</option>)}</select></label>
        </div>
        <button onClick={() => assignDriver(assignmentDriverId, assignmentBusId, assignmentRouteId)} className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">Assign driver to bus and route</button>
        <div className="mt-6 rounded-2xl border p-4"><h3 className="text-xl font-black">Students</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{students.map(student => <div key={student._id} className="rounded-xl bg-slate-50 p-4"><p className="font-bold">{student.name} · {student.className}{student.section ? ` / ${student.section}` : ''}</p><p className="text-sm text-slate-600">{student.email}</p><p className="mt-1 text-sm text-slate-600">Guardian: {student.guardianUserId?.name || '—'} · Bus: {student.assignedBusId?.busNumber || '—'}</p></div>)}{students.length === 0 && <p className="text-sm text-slate-500">No student accounts yet.</p>}</div></div>
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
      <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Driver reports & emergencies</h2><p className="mt-1 text-sm text-slate-500">Reports are tied to an active trip and visible only to this school.</p></div><button onClick={() => loadFleet()} className="rounded-xl border px-4 py-2 font-bold">Refresh reports</button></div>
        <div className="mt-4 space-y-3">
          {incidents.map(incident => <article key={incident._id} className={`rounded-2xl border p-4 ${incident.type === 'sos' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black uppercase">{incident.type} · {incident.status}</p><p className="mt-1 font-semibold">{incident.message}</p><p className="mt-1 text-sm text-slate-600">Bus: {incident.busId?.busNumber || 'Unknown'} · Driver: {incident.driverId?.name || 'Unknown'} · Route: {incident.routeId?.routeName || 'Unknown'}</p><p className="mt-1 text-xs text-slate-500">{new Date(incident.createdAt).toLocaleString()}</p></div>
              {incident.status !== 'resolved' && <div className="flex gap-2">{incident.status === 'open' && <button onClick={() => updateIncidentStatus(incident._id, 'acknowledged')} className="rounded-lg border px-3 py-2 text-sm font-bold">Acknowledge</button>}<button onClick={() => updateIncidentStatus(incident._id, 'resolved')} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Resolve</button></div>}
            </div>
          </article>)}
          {incidents.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No reports yet.</p>}
        </div>
      </section>
    </div>
  </main>;
}
