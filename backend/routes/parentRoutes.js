const router = require('express').Router();
const auth = require('../middleware/auth');
const Student = require('../models/Student');
const TripSession = require('../models/TripSession');

router.use(auth('parent'));

router.get('/children', async (req, res, next) => {
  try {
    const children = await Student.find({ guardianIds: req.user.sub, active: true })
      .populate('busId', 'busNumber licensePlate status routeId')
      .populate('routeId', 'routeName stops');
    res.json(children);
  } catch (error) { next(error); }
});

router.get('/children/:id/bus', async (req, res, next) => {
  try {
    const child = await Student.findOne({ _id: req.params.id, guardianIds: req.user.sub })
      .populate('guardianIds', 'name email')
      .populate('busId', 'busNumber licensePlate status routeId')
      .populate('routeId', 'routeName stops');
    if (!child) return res.status(403).json({ message: 'This student is not linked to your parent account.' });
    if (!child.busId || !child.routeId) return res.status(404).json({ message: 'No bus or route is assigned to this child yet.' });
    const trip = await TripSession.findOne({ busId: child.busId._id, routeId: child.routeId._id, status: 'active' }).sort({ startedAt: -1 });
    res.json({ child, bus: child.busId, route: child.routeId, pickupStop: child.pickupStop, dropStop: child.dropStop, trip });
  } catch (error) { next(error); }
});

module.exports = router;
