const router = require('express').Router();
const auth = require('../middleware/auth');
const Bus = require('../models/Bus');
const User = require('../models/User');
const Route = require('../models/Route');
const TripSession = require('../models/TripSession');

router.post('/start', auth('driver'), async (req, res, next) => {
  try {
    const { busId, routeId } = req.body;
    const bus = await Bus.findOne({ _id: busId, driverId: req.user.sub });
    if (!bus) return res.status(403).json({ message: 'Bus is not assigned to this driver.' });
    if (String(bus.routeId) !== String(routeId)) return res.status(403).json({ message: 'The selected route does not match your assigned bus.' });
    const route = await Route.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Assigned route not found.' });
    const existing = await TripSession.findOne({ busId, status: 'active' });
    if (existing) return res.status(409).json({ message: 'An active trip already exists for this bus.' });
    res.status(201).json(await TripSession.create({ busId, routeId, driverId: req.user.sub }));
  } catch (error) { next(error); }
});

router.post('/:id/end', auth('driver'), async (req, res, next) => {
  try {
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
    if (req.user.role === 'parent') {
      const user = await User.findById(req.user.sub).select('assignedBusId');
      if (!user?.assignedBusId || String(user.assignedBusId) !== String(req.params.busId)) {
        return res.status(403).json({ message: 'You are not assigned to this bus.' });
      }
    }
    const trip = await TripSession.findOne({ busId: req.params.busId, status: 'active' }).populate('routeId');
    res.json(trip);
  } catch (error) { next(error); }
});

router.get('/assignment', auth('driver'), async (req, res, next) => {
  try {
    const bus = await Bus.findOne({ driverId: req.user.sub }).populate('routeId');
    if (!bus) return res.status(404).json({ message: 'No bus is assigned to this driver.' });
    res.json({ bus, route: bus.routeId });
  } catch (error) { next(error); }
});

router.get('/parent-assignment', auth('parent'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).populate({ path: 'assignedBusId', populate: { path: 'routeId' } });
    if (!user) return res.status(404).json({ message: 'Parent account not found.' });
    if (!user.assignedBusId) return res.status(404).json({ message: 'No bus is assigned to your account yet. Please contact your school.' });
    const trip = await TripSession.findOne({ busId: user.assignedBusId._id, status: 'active' }).sort({ startedAt: -1 });
    res.json({ bus: user.assignedBusId, route: user.assignedBusId.routeId, trip });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => res.status(error.status || 400).json({ message: error.message }));
module.exports = router;
