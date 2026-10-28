const router = require('express').Router();
const auth = require('../middleware/auth');
const Bus = require('../models/Bus');
const TripSession = require('../models/TripSession');

router.post('/start', auth('driver'), async (req, res, next) => {
  try {
    const { busId, routeId } = req.body;
    const bus = await Bus.findById(busId);
    if (!bus || String(bus.driverId) !== req.user.sub) return res.status(403).json({ message: 'Bus is not assigned to this driver' });
    const existing = await TripSession.findOne({ busId, status: 'active' });
    if (existing) return res.status(409).json({ message: 'An active trip already exists for this bus' });
    const trip = await TripSession.create({ busId, routeId, driverId: req.user.sub });
    res.status(201).json(trip);
  } catch (error) { next(error); }
});

router.post('/:id/end', auth('driver'), async (req, res, next) => {
  try {
    const trip = await TripSession.findOneAndUpdate({ _id: req.params.id, driverId: req.user.sub, status: 'active' }, { status: 'completed', endedAt: new Date() }, { new: true });
    if (!trip) return res.sendStatus(404);
    res.json(trip);
  } catch (error) { next(error); }
});

router.get('/active/:busId', async (req, res, next) => {
  try { const trip = await TripSession.findOne({ busId: req.params.busId, status: 'active' }); res.json(trip); } catch (error) { next(error); }
});

router.get('/assignment', auth('driver'), async (req, res, next) => {
  try {
    const bus = await Bus.findOne({ driverId: req.user.sub }).populate('routeId');
    if (!bus) return res.status(404).json({ message: 'No bus is assigned to this driver' });
    res.json({ bus, route: bus.routeId });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => res.status(error.status || 400).json({ message: error.message }));
module.exports = router;
