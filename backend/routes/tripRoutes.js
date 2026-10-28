const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Bus = require('../models/Bus');
const User = require('../models/User');
const Route = require('../models/Route');
const TripSession = require('../models/TripSession');

function validId(value) { return mongoose.isValidObjectId(value); }

router.post('/start', auth('driver'), async (req, res, next) => {
  try {
    const { busId, routeId } = req.body || {};
    if (!validId(busId) || !validId(routeId)) return res.status(400).json({ message: 'A valid assigned bus and route are required.' });
    const bus = await Bus.findOne({ _id: busId, driverId: req.user.sub });
    if (!bus) return res.status(403).json({ message: 'Bus is not assigned to this driver.' });
    if (String(bus.routeId) !== String(routeId)) return res.status(403).json({ message: 'The selected route does not match your assigned bus.' });
    const route = await Route.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Assigned route not found.' });
    const driver = await User.findById(req.user.sub).select('schoolId role');
    if (!driver || (driver.schoolId && String(route.schoolId) !== String(driver.schoolId))) {
      return res.status(403).json({ message: 'This route is not assigned to your school account.' });
    }
    const existing = await TripSession.findOne({ busId, status: 'active' });
    if (existing) return res.status(409).json({ message: 'An active trip already exists for this bus.' });
    res.status(201).json(await TripSession.create({ busId, routeId, driverId: req.user.sub }));
  } catch (error) { next(error); }
});

router.post('/:id/end', auth('driver'), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid trip ID.' });
    const trip = await TripSession.findOneAndUpdate(
      { _id: req.params.id, driverId: req.user.sub, status: 'active' },
      { status: 'completed', endedAt: new Date() }, { new: true }
    );
    if (!trip) return res.status(404).json({ message: 'Active trip not found for this driver.' });
    res.json(trip);
  } catch (error) { next(error); }
});

router.get('/active/:busId', auth(['parent', 'admin']), async (req, res, next) => {
  try {
    if (!validId(req.params.busId)) return res.status(400).json({ message: 'Invalid bus ID.' });
    if (req.user.role === 'parent') {
      const user = await User.findById(req.user.sub).select('assignedBusId schoolId');
      if (!user?.assignedBusId || String(user.assignedBusId) !== String(req.params.busId)) {
        return res.status(403).json({ message: 'You are not assigned to this bus.' });
      }
      const bus = await Bus.findById(req.params.busId).populate('routeId');
      if (user.schoolId && bus?.routeId?.schoolId && String(user.schoolId) !== String(bus.routeId.schoolId)) {
        return res.status(403).json({ message: 'This bus is not part of your school.' });
      }
    }
    const trip = await TripSession.findOne({ busId: req.params.busId, status: 'active' }).populate('routeId');
    res.json(trip);
  } catch (error) { next(error); }
});

router.get('/assignment', auth('driver'), async (req, res, next) => {
  try {
    const driver = await User.findById(req.user.sub).select('schoolId');
    const bus = await Bus.findOne({ driverId: req.user.sub }).populate('routeId');
    if (!bus) return res.status(404).json({ message: 'No bus is assigned to this driver.' });
    if (!bus.routeId) return res.status(409).json({ message: 'Your bus does not have a route assigned yet.' });
    if (driver?.schoolId && String(driver.schoolId) !== String(bus.routeId.schoolId)) {
      return res.status(403).json({ message: 'Your bus route belongs to a different school.' });
    }
    const activeTrip = await TripSession.findOne({ busId: bus._id, driverId: req.user.sub, status: 'active' }).sort({ startedAt: -1 });
    res.json({ bus, route: bus.routeId, activeTrip });
  } catch (error) { next(error); }
});

router.get('/student-assignment', auth('student'), async (req, res, next) => {
  try {
    const student = await User.findById(req.user.sub)
      .select('name schoolId assignedBusId className section guardianUserId')
      .populate({ path: 'assignedBusId', populate: { path: 'routeId' } });
    if (!student) return res.status(404).json({ message: 'Student account not found.' });
    if (!student.assignedBusId) return res.status(404).json({ message: 'No bus is assigned to your account yet. Please contact your school.' });
    const bus = student.assignedBusId;
    const route = bus.routeId;
    if (!route) return res.status(409).json({ message: 'Your assigned bus does not have a route yet.' });
    if (!student.schoolId || String(student.schoolId) !== String(route.schoolId) || String(bus.schoolId) !== String(student.schoolId)) {
      return res.status(403).json({ message: 'This assignment does not belong to your school account.' });
    }
    const trip = await TripSession.findOne({ busId: bus._id, status: 'active' }).sort({ startedAt: -1 });
    res.json({ student: { name: student.name, className: student.className, section: student.section }, bus, route, trip });
  } catch (error) { next(error); }
});

router.get('/parent-assignment', auth('parent'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select('schoolId assignedBusId').populate({
      path: 'assignedBusId',
      populate: { path: 'routeId' }
    });
    if (!user) return res.status(404).json({ message: 'Parent account not found.' });
    if (!user.assignedBusId) return res.status(404).json({ message: 'No bus is assigned to your account yet. Please contact your school.' });
    const bus = user.assignedBusId;
    const route = bus.routeId;
    if (!route) return res.status(409).json({ message: 'Your assigned bus does not have a route yet. Please contact your school.' });
    if (user.schoolId && String(user.schoolId) !== String(route.schoolId)) {
      return res.status(403).json({ message: 'This assignment does not belong to your school account.' });
    }
    const trip = await TripSession.findOne({ busId: bus._id, status: 'active' }).sort({ startedAt: -1 });
    res.json({ bus, route, trip });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => {
  res.status(error.status || 400).json({ message: error.message || 'Request could not be completed.' });
});
module.exports = router;
