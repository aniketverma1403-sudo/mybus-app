const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const TripSession = require('../models/TripSession');
const Incident = require('../models/Incident');

function validId(value) { return mongoose.isValidObjectId(value); }

router.post('/', auth('driver'), async (req, res, next) => {
  try {
    const { tripId, type, message } = req.body || {};
    if (!validId(tripId)) return res.status(400).json({ message: 'A valid active trip is required.' });
    if (!['delay', 'sos', 'breakdown'].includes(type)) return res.status(400).json({ message: 'Incident type must be delay, sos, or breakdown.' });
    const safeMessage = typeof message === 'string' ? message.trim().slice(0, 500) : '';
    if (!safeMessage) return res.status(400).json({ message: 'Please provide a short incident description.' });
    const trip = await TripSession.findOne({ _id: tripId, driverId: req.user.sub, status: 'active' });
    if (!trip) return res.status(403).json({ message: 'You can only report incidents for your own active trip.' });
    const bus = await Bus.findById(trip.busId).select('schoolId');
    const route = await Route.findById(trip.routeId).select('schoolId');
    if (!bus?.schoolId || !route?.schoolId || bus.schoolId !== route.schoolId) {
      return res.status(409).json({ message: 'The bus and route do not have a consistent school assignment.' });
    }
    const incident = await Incident.create({
      schoolId: bus.schoolId, busId: trip.busId, routeId: trip.routeId,
      tripId: trip._id, driverId: req.user.sub, type, message: safeMessage
    });
    res.status(201).json({ incident, message: type === 'sos' ? 'Emergency alert sent to the school administrator.' : 'Report sent to the school administrator.' });
  } catch (error) { next(error); }
});

router.get('/admin', auth('admin'), async (req, res, next) => {
  try {
    const schoolId = typeof req.user.schoolId === 'string' ? req.user.schoolId.trim() : '';
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const incidents = await Incident.find({ schoolId }).sort({ createdAt: -1 }).limit(100)
      .populate('busId', 'busNumber licensePlate')
      .populate('driverId', 'name phone')
      .populate('routeId', 'routeName');
    res.json(incidents);
  } catch (error) { next(error); }
});

router.patch('/:id/status', auth('admin'), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid incident ID.' });
    const schoolId = typeof req.user.schoolId === 'string' ? req.user.schoolId.trim() : '';
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const { status } = req.body || {};
    if (!['acknowledged', 'resolved'].includes(status)) return res.status(400).json({ message: 'Status must be acknowledged or resolved.' });
    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { $set: { status, resolvedAt: status === 'resolved' ? new Date() : null } },
      { new: true, runValidators: true }
    );
    if (!incident) return res.status(404).json({ message: 'Incident not found.' });
    res.json(incident);
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => {
  res.status(error.status || 400).json({ message: error.message || 'Incident request could not be completed.' });
});
module.exports = router;
