require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');
const parentRoutes = require('./routes/parentRoutes');
const TripSession = require('./models/TripSession');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((origin) => origin.trim());
const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));
app.get('/', (_req, res) => res.json({ name: 'School Bus Tracker API', status: 'running', health: '/api/health' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/parent', parentRoutes);

// Authenticate every Socket.IO client before allowing tracking events.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select('_id role assignedBusId');
    if (!user || user.role !== decoded.role) return next(new Error('Invalid session'));
    socket.data.user = { id: String(user._id), role: user.role, assignedBusId: user.assignedBusId ? String(user.assignedBusId) : null };
    next();
  } catch (_error) { next(new Error('Invalid or expired session')); }
});

io.on('connection', (socket) => {
  socket.on('join-bus-room', async (requestedBusId) => {
    const user = socket.data.user;
    if (!requestedBusId || !['parent', 'driver'].includes(user.role)) return;
    try {
      let allowed = user.role === 'parent' && user.assignedBusId === String(requestedBusId);
      if (user.role === 'driver') allowed = Boolean(await Bus.findOne({ _id: requestedBusId, driverId: user.id }).select('_id'));
      if (!allowed) return socket.emit('tracking-error', { message: 'You are not authorized to view this bus.' });
      socket.join(String(requestedBusId));
      socket.emit('room-joined', String(requestedBusId));
    } catch (_error) { socket.emit('tracking-error', { message: 'Unable to join the bus tracking room.' }); }
  });
  socket.on('leave-bus-room', (busId) => { if (busId) socket.leave(String(busId)); });
  socket.on('update-location', async (payload) => {
    const user = socket.data.user;
    if (user.role !== 'driver') return socket.emit('tracking-error', { message: 'Only assigned drivers can share GPS.' });
    const { tripId, busId, latitude, longitude } = payload || {};
    const lat = Number(latitude); const lng = Number(longitude);
    if (!tripId || !busId || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    try {
      const bus = await Bus.findOne({ _id: busId, driverId: user.id }).select('_id');
      if (!bus) return socket.emit('tracking-error', { message: 'This bus is not assigned to your account.' });
      const updated = await TripSession.findOneAndUpdate(
        { _id: tripId, busId, driverId: user.id, status: 'active' },
        { currentLocation: { latitude: lat, longitude: lng }, updatedAt: new Date() }, { new: true }
      );
      if (!updated) return socket.emit('tracking-error', { message: 'Active trip not found.' });
      io.to(String(busId)).emit('bus-location', { busId: String(busId), tripId: String(tripId), latitude: lat, longitude: lng, timestamp: Date.now() });
    } catch (_error) { socket.emit('tracking-error', { message: 'Unable to save the current location.' }); }
  });
});

async function start() {
  let mongoUri = process.env.MONGODB_URI; let memoryServer;
  if (process.env.USE_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create(); mongoUri = memoryServer.getUri();
    console.log('Local in-memory MongoDB started');
  }
  if (!mongoUri) throw new Error('MONGODB_URI is required in backend/.env or enable USE_MEMORY_DB');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in backend/.env');
  await mongoose.connect(mongoUri);
  await ensureDemoData();
  const port = Number(process.env.PORT) || 5001;
  server.listen(port, () => console.log(`Bus tracker API listening on http://localhost:${port}`));
  const shutdown = async () => { await mongoose.disconnect(); await memoryServer?.stop(); server.close(() => process.exit(0)); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
async function ensureDemoData() {
  const defaultPassword = 'Demo@1234';
  const schoolId = process.env.SCHOOL_ID || 'school-demo';
  let admin = await User.findOne({ email: 'admin@school.com' });
  if (!admin) admin = await User.create({ name: 'Demo School Admin', email: 'admin@school.com', password: defaultPassword, role: 'admin', schoolId });
  else await User.updateOne({ _id: admin._id }, { $set: { schoolId } });

  let driver = await User.findOne({ email: 'ramesh@school.com' });
  if (!driver) driver = await User.create({ name: 'Ramesh Kumar', email: 'ramesh@school.com', phone: '+91 98765 43210', password: defaultPassword, role: 'driver', schoolId });
  else await User.updateOne({ _id: driver._id }, { $set: { name: 'Ramesh Kumar', phone: '+91 98765 43210', schoolId } });

  let parent = await User.findOne({ email: 'parent@school.com' });
  if (!parent) parent = await User.create({ name: 'Demo Parent', email: 'parent@school.com', password: defaultPassword, role: 'parent', schoolId });
  else await User.updateOne({ _id: parent._id }, { $set: { schoolId } });

  let route = await Route.findOne({ routeName: 'Route A', schoolId });
  if (!route) route = await Route.create({ routeName: 'Route A', schoolId, stops: [] });

  const busSpecs = [
    { busNumber: '101', licensePlate: 'HP541234', capacity: 40, studentCount: 0 },
    { busNumber: '102', licensePlate: 'HP545678', capacity: 35, studentCount: 0 },
    { busNumber: '103', licensePlate: 'HP549999', capacity: 50, studentCount: 0 }
  ];
  let bus101;
  for (const spec of busSpecs) {
    const bus = await Bus.findOneAndUpdate({ busNumber: spec.busNumber }, spec, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (spec.busNumber === '101') bus101 = bus;
  }

  await Bus.updateOne({ _id: bus101._id }, { $set: { driverId: driver._id, routeId: route._id } });
  await User.updateOne({ _id: driver._id }, { $set: { assignedBusId: bus101._id, schoolId } });
  await User.updateOne({ _id: parent._id }, { $set: { assignedBusId: bus101._id, schoolId } });
  await User.updateMany({ role: 'parent', schoolId: null }, { $set: { schoolId, assignedBusId: bus101._id } });
  await User.updateMany({ role: 'parent', assignedBusId: null }, { $set: { assignedBusId: bus101._id } });
}
if (require.main === module) start().catch((error) => { console.error(error); process.exit(1); });
module.exports = { app, server, io };
