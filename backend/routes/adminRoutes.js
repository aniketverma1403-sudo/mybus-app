const router = require('express').Router();
const auth = require('../middleware/auth');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const TripSession = require('../models/TripSession');
const User = require('../models/User');

router.use(auth('admin'));
router.get('/overview', async (_req, res, next) => { try {
  const [buses, routes, activeTrips] = await Promise.all([
    Bus.countDocuments(), Route.countDocuments(), TripSession.countDocuments({ status: 'active' })
  ]);
  res.json({ buses, routes, activeTrips });
} catch (error) { next(error); } });

router.get('/buses', async (_req, res, next) => { try { res.json(await Bus.find().populate('driverId routeId')); } catch (error) { next(error); } });
router.post('/buses', async (req, res, next) => { try {
  const { busNumber, licensePlate, capacity, studentCount } = req.body;
  if (!busNumber?.trim()) return res.status(400).json({ message: 'Bus number is required.' });
  if (!licensePlate?.trim()) return res.status(400).json({ message: 'License plate is required.' });
  const parsedCapacity = Number(capacity);
  if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) return res.status(400).json({ message: 'Seating capacity must be at least 1.' });
  const parsedStudentCount = Number(studentCount || 0);
  if (!Number.isInteger(parsedStudentCount) || parsedStudentCount < 0) return res.status(400).json({ message: 'Student count cannot be negative.' });
  if (parsedStudentCount > parsedCapacity) return res.status(400).json({ message: 'Student count cannot exceed seating capacity.' });
  res.status(201).json(await Bus.create({
    ...req.body,
    busNumber: busNumber.trim(),
    licensePlate: licensePlate.trim(),
    capacity: parsedCapacity,
    studentCount: parsedStudentCount
  }));
} catch (error) { next(error); } });
router.put('/buses/:id', async (req, res, next) => { try { const item = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.sendStatus(404); res.json(item); } catch (error) { next(error); } });
router.delete('/buses/:id', async (req, res, next) => { try {
  const bus = await Bus.findById(req.params.id);
  if (!bus) return res.status(404).json({ message: 'Bus not found.' });
  if (bus.driverId) await User.findByIdAndUpdate(bus.driverId, { assignedBusId: null });
  await Bus.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
} catch (error) { next(error); } });

router.get('/routes', async (_req, res, next) => { try { res.json(await Route.find()); } catch (error) { next(error); } });
router.post('/routes', async (req, res, next) => { try { res.status(201).json(await Route.create(req.body)); } catch (error) { next(error); } });
router.put('/routes/:id', async (req, res, next) => { try { const item = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.sendStatus(404); res.json(item); } catch (error) { next(error); } });
router.delete('/routes/:id', async (req, res, next) => { try { await Route.findByIdAndDelete(req.params.id); res.sendStatus(204); } catch (error) { next(error); } });

router.post('/drivers', async (req, res, next) => {
  try {
    const { name, email, password, phone, licenseNumber, busId, routeId } = req.body;
    const driver = await User.create({ name, email, password, role: 'driver', phone, licenseNumber, assignedBusId: busId || null });
    if (busId) await Bus.findByIdAndUpdate(busId, { driverId: driver._id, routeId: routeId || undefined });
    res.status(201).json({ id: driver._id, name: driver.name, email: driver.email });
  } catch (error) { next(error); }
});

router.get('/drivers', async (_req, res, next) => { try {
  res.json(await User.find({ role: 'driver' }).select('name email phone licenseNumber assignedBusId'));
} catch (error) { next(error); } });

router.put('/drivers/:id/assignment', async (req, res, next) => {
  try {
    const { busId, routeId } = req.body;
    if (!busId) return res.status(400).json({ message: 'Bus is required for assignment.' });
    if (!routeId) return res.status(400).json({ message: 'Route is required for assignment.' });
    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    const bus = await Bus.findById(busId);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (!bus) return res.status(404).json({ message: 'Bus not found.' });
    const route = await Route.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Route not found.' });

    if (bus.driverId && String(bus.driverId) !== String(driver._id)) {
      await User.findByIdAndUpdate(bus.driverId, { assignedBusId: null });
    }
    await User.findByIdAndUpdate(driver._id, { assignedBusId: busId });
    await Bus.findByIdAndUpdate(busId, { driverId: driver._id, routeId });
    res.json({ assigned: true, driverId: driver._id, busId, routeId });
  } catch (error) { next(error); }
});

router.get('/parents', async (_req, res, next) => {
  try {
    res.json(await User.find({ role: 'parent' }).select('name email schoolId assignedBusId'));
  } catch (error) { next(error); }
});

router.put('/parents/:id/assignment', async (req, res, next) => {
  try {
    const { busId } = req.body;
    if (!busId) return res.status(400).json({ message: 'Select a bus for this parent.' });
    const [parent, bus] = await Promise.all([
      User.findOne({ _id: req.params.id, role: 'parent' }),
      Bus.findById(busId).populate('routeId')
    ]);
    if (!parent) return res.status(404).json({ message: 'Parent account not found.' });
    if (!bus) return res.status(404).json({ message: 'Bus not found.' });
    if (parent.schoolId && bus.routeId?.schoolId && String(parent.schoolId) !== String(bus.routeId.schoolId)) {
      return res.status(403).json({ message: 'Parent and bus must belong to the same school.' });
    }
    parent.assignedBusId = bus._id;
    await parent.save();
    res.json({ assigned: true, parentId: parent._id, busId: bus._id });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => res.status(error.status || 400).json({ message: error.message }));
module.exports = router;
