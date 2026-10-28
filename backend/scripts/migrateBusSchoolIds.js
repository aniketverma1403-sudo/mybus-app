require('dotenv').config();
const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const User = require('../models/User');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env.');
  await mongoose.connect(process.env.MONGODB_URI);
  const legacyBuses = await Bus.find({ $or: [{ schoolId: { $exists: false } }, { schoolId: null }, { schoolId: '' }] }).select('_id routeId driverId busNumber');
  let migrated = 0;
  const skipped = [];
  for (const bus of legacyBuses) {
    const route = bus.routeId ? await Route.findById(bus.routeId).select('schoolId') : null;
    const driver = !route && bus.driverId ? await User.findById(bus.driverId).select('schoolId') : null;
    const schoolId = route?.schoolId || driver?.schoolId;
    if (!schoolId) {
      skipped.push({ busNumber: bus.busNumber, reason: 'No school ID on the bus route or assigned driver' });
      continue;
    }
    await Bus.updateOne({ _id: bus._id }, { $set: { schoolId: String(schoolId) } });
    migrated += 1;
  }
  console.log(JSON.stringify({ migrated, skipped }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
