require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');
const TripSession = require('./models/TripSession');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',');
const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({
    name: 'School Bus Tracker API',
    status: 'running',
    health: '/api/health'
  });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripRoutes);

io.on('connection', (socket) => {
  socket.on('join-bus-room', (busId) => {
    if (!busId) return;
    socket.join(String(busId));
    socket.emit('room-joined', String(busId));
  });

  socket.on('leave-bus-room', (busId) => {
    if (busId) socket.leave(String(busId));
  });

  socket.on('update-location', async (payload) => {
    const { tripId, busId, latitude, longitude } = payload || {};
    if (!tripId || !busId || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return;

    try {
      const updated = await TripSession.findOneAndUpdate(
        { _id: tripId, busId, status: 'active' },
        { currentLocation: { latitude: Number(latitude), longitude: Number(longitude) }, updatedAt: new Date() },
        { new: true }
      );
      if (!updated) return socket.emit('tracking-error', { message: 'Active trip not found' });
      io.to(String(busId)).emit('bus-location', { busId: String(busId), tripId, latitude: Number(latitude), longitude: Number(longitude), timestamp: Date.now() });
    } catch (error) {
      socket.emit('tracking-error', { message: error.message });
    }
  });
});

async function start() {
  let mongoUri = process.env.MONGODB_URI;
  let memoryServer;

  if (process.env.USE_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri();
    console.log('Local in-memory MongoDB started');
  }

  if (!mongoUri) throw new Error('MONGODB_URI is required in backend/.env or enable USE_MEMORY_DB');
  await mongoose.connect(mongoUri);
  const port = Number(process.env.PORT) || 5001;
  server.listen(port, () => console.log(`Bus tracker API listening on http://localhost:${port}`));

  const shutdown = async () => {
    await mongoose.disconnect();
    await memoryServer?.stop();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => { console.error(error); process.exit(1); });

module.exports = { app, server, io };
