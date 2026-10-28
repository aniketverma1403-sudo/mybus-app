const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const TripSession = require('../models/TripSession');
const User = require('../models/User');

router.use(auth('admin'));

function validId(value) { return mongoose.isValidObjectId(value); }
function adminSchool(req) { return typeof req.user.schoolId === 'string' ? req.user.schoolId.trim() : ''; }

router.get('/overview', async (req, res, next) => {
  try {
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const routeIds = await Route.find({ schoolId }).distinct('_id');
    const [buses, routes, activeTrips] = await Promise.all([
      Bus.countDocuments({ schoolId }), Route.countDocuments({ schoolId }),
      TripSession.countDocuments({ status: 'active', routeId: { $in: routeIds } })
    ]);
    res.json({ buses, routes, activeTrips });
  } catch (error) { next(error); }
});

router.get('/buses', async (req, res, next) => {
  try {
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    res.json(await Bus.find({ schoolId }).populate('driverId', 'name email').populate('routeId', 'routeName schoolId'));
  }
  catch (error) { next(error); }
});

router.post('/buses', async (req, res, next) => {
  try {
    const { busNumber, licensePlate, capacity, studentCount } = req.body || {};
    if (!adminSchool(req)) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    if (typeof busNumber !== 'string' || !busNumber.trim()) return res.status(400).json({ message: 'Bus number is required.' });
    if (typeof licensePlate !== 'string' || !licensePlate.trim()) return res.status(400).json({ message: 'License plate is required.' });
    const parsedCapacity = Number(capacity);
    const parsedStudentCount = Number(studentCount ?? 0);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) return res.status(400).json({ message: 'Seating capacity must be a positive whole number.' });
    if (!Number.isInteger(parsedStudentCount) || parsedStudentCount < 0) return res.status(400).json({ message: 'Student count must be a non-negative whole number.' });
    if (parsedStudentCount > parsedCapacity) return res.status(400).json({ message: 'Student count cannot exceed seating capacity.' });
    const bus = await Bus.create({
      busNumber: busNumber.trim().toUpperCase(),
      schoolId: adminSchool(req),
      licensePlate: licensePlate.trim().toUpperCase(),
      capacity: parsedCapacity,
      studentCount: parsedStudentCount
    });
    res.status(201).json(bus);
  } catch (error) { next(error); }
});

router.put('/buses/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid bus ID.' });
    const { busNumber, licensePlate, capacity, studentCount } = req.body || {};
    const update = {};
    if (busNumber !== undefined) {
      if (typeof busNumber !== 'string' || !busNumber.trim()) return res.status(400).json({ message: 'Bus number is required.' });
      update.busNumber = busNumber.trim().toUpperCase();
    }
    if (licensePlate !== undefined) {
      if (typeof licensePlate !== 'string' || !licensePlate.trim()) return res.status(400).json({ message: 'License plate is required.' });
      update.licensePlate = licensePlate.trim().toUpperCase();
    }
    if (capacity !== undefined) {
      update.capacity = Number(capacity);
      if (!Number.isInteger(update.capacity) || update.capacity < 1) return res.status(400).json({ message: 'Seating capacity must be a positive whole number.' });
    }
    if (studentCount !== undefined) {
      update.studentCount = Number(studentCount);
      if (!Number.isInteger(update.studentCount) || update.studentCount < 0) return res.status(400).json({ message: 'Student count must be a non-negative whole number.' });
    }
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const current = await Bus.findOne({ _id: req.params.id, schoolId });
    if (!current) return res.status(404).json({ message: 'Bus not found.' });
    if ((update.studentCount ?? current.studentCount) > (update.capacity ?? current.capacity)) {
      return res.status(400).json({ message: 'Student count cannot exceed seating capacity.' });
    }
    const item = await Bus.findOneAndUpdate({ _id: req.params.id, schoolId }, update, { new: true, runValidators: true });
    res.json(item);
  } catch (error) { next(error); }
});

router.delete('/buses/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid bus ID.' });
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const bus = await Bus.findOne({ _id: req.params.id, schoolId });
    if (!bus) return res.status(404).json({ message: 'Bus not found.' });
    if (await TripSession.exists({ busId: bus._id, status: 'active' })) {
      return res.status(409).json({ message: 'End the active trip before deleting this bus.' });
    }
    await Promise.all([
      User.updateMany({ schoolId, assignedBusId: bus._id }, { $set: { assignedBusId: null } }),
      TripSession.updateMany({ busId: bus._id, status: 'active' }, { $set: { status: 'cancelled', endedAt: new Date() } })
    ]);
    if (bus.driverId) await User.findOneAndUpdate({ _id: bus.driverId, schoolId }, { assignedBusId: null });
    await Bus.findOneAndDelete({ _id: bus._id, schoolId });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.get('/routes', async (req, res, next) => {
  try {
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    res.json(await Route.find({ schoolId }));
  }
  catch (error) { next(error); }
});

router.post('/routes', async (req, res, next) => {
  try {
    const { routeName, stops } = req.body || {};
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator has no school ID. Configure SCHOOL_ID and create or update the administrator account.' });
    if (typeof routeName !== 'string' || !routeName.trim()) return res.status(400).json({ message: 'Route name is required.' });
    if (stops !== undefined && !Array.isArray(stops)) return res.status(400).json({ message: 'Stops must be an array.' });
    res.status(201).json(await Route.create({ routeName: routeName.trim(), schoolId, stops: stops || [] }));
  } catch (error) { next(error); }
});

router.put('/routes/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid route ID.' });
    const { routeName, stops } = req.body || {};
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const update = {};
    if (routeName !== undefined) {
      if (typeof routeName !== 'string' || !routeName.trim()) return res.status(400).json({ message: 'Route name is required.' });
      update.routeName = routeName.trim();
    }
    if (stops !== undefined) {
      if (!Array.isArray(stops)) return res.status(400).json({ message: 'Stops must be an array.' });
      update.stops = stops;
    }
    const item = await Route.findOneAndUpdate({ _id: req.params.id, schoolId }, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Route not found.' });
    res.json(item);
  } catch (error) { next(error); }
});

router.delete('/routes/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid route ID.' });
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const route = await Route.findOne({ _id: req.params.id, schoolId });
    if (!route) return res.status(404).json({ message: 'Route not found.' });
    if (await Bus.exists({ routeId: route._id })) return res.status(409).json({ message: 'Remove this route from its bus before deleting it.' });
    if (await TripSession.exists({ routeId: route._id, status: 'active' })) return res.status(409).json({ message: 'End the active trip before deleting this route.' });
    await Route.findOneAndDelete({ _id: route._id, schoolId });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.post('/drivers', async (req, res, next) => {
  try {
    const { name, email, password, phone, licenseNumber } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 8 characters are required.' });
    }
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const driver = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'driver',
      phone: typeof phone === 'string' ? phone.trim() : '',
      licenseNumber: typeof licenseNumber === 'string' ? licenseNumber.trim() : '',
      schoolId,
      assignedBusId: null
    });
    res.status(201).json({ id: driver._id, name: driver.name, email: driver.email });
  } catch (error) { next(error); }
});

router.get('/drivers', async (req, res, next) => {
  try {
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    res.json(await User.find({ role: 'driver', schoolId }).select('name email phone licenseNumber assignedBusId schoolId'));
  }
  catch (error) { next(error); }
});

router.put('/drivers/:id/assignment', async (req, res, next) => {
  try {
    const { busId, routeId } = req.body || {};
    if (!validId(req.params.id) || !validId(busId) || !validId(routeId)) return res.status(400).json({ message: 'Select a valid driver, bus, and route.' });
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const [driver, bus, route] = await Promise.all([
      User.findOne({ _id: req.params.id, role: 'driver', schoolId }),
      Bus.findOne({ _id: busId, schoolId }),
      Route.findOne({ _id: routeId, schoolId })
    ]);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (!bus) return res.status(404).json({ message: 'Bus not found.' });
    if (!route) return res.status(404).json({ message: 'Route not found.' });
    if (route.schoolId !== schoolId) return res.status(403).json({ message: 'The route belongs to a different school.' });
    if (driver.schoolId && route.schoolId !== driver.schoolId) return res.status(403).json({ message: 'The driver belongs to a different school.' });
    if (bus.driverId && String(bus.driverId) !== String(driver._id)) {
      await User.findOneAndUpdate({ _id: bus.driverId, schoolId }, { assignedBusId: null });
    }
    if (driver.assignedBusId && String(driver.assignedBusId) !== String(bus._id)) {
      await Bus.findOneAndUpdate({ _id: driver.assignedBusId, driverId: driver._id, schoolId }, { $set: { driverId: null } });
    }
    driver.assignedBusId = bus._id;
    driver.schoolId = route.schoolId;
    await driver.save();
    bus.driverId = driver._id;
    bus.routeId = route._id;
    await bus.save();
    res.json({ assigned: true, driverId: driver._id, busId: bus._id, routeId: route._id });
  } catch (error) { next(error); }
});

router.post('/parents', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {};
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 8 characters are required.' });
    }
    const parent = await User.create({
      name: name.trim().slice(0, 100),
      email: email.trim().toLowerCase(),
      password,
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: 'parent',
      schoolId,
      assignedBusId: null
    });
    res.status(201).json({ id: parent._id, name: parent.name, email: parent.email });
  } catch (error) { next(error); }
});

router.post('/students', async (req, res, next) => {
  try {
    const { name, email, password, className, section, guardianId, busId } = req.body || {};
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || password.length < 8 || typeof className !== 'string' || !className.trim() ||
        !validId(guardianId) || !validId(busId)) {
      return res.status(400).json({ message: 'Name, email, password (8+ characters), class, parent, and bus are required.' });
    }
    const [guardian, bus] = await Promise.all([
      User.findOne({ _id: guardianId, role: 'parent', schoolId }),
      Bus.findOne({ _id: busId, schoolId }).populate('routeId')
    ]);
    if (!guardian) return res.status(404).json({ message: 'Parent/guardian account not found in this school.' });
    if (!bus || !bus.routeId) return res.status(409).json({ message: 'Select a bus with a route assigned.' });
    const student = await User.create({
      name: name.trim().slice(0, 100),
      email: email.trim().toLowerCase(),
      password,
      role: 'student',
      schoolId,
      className: className.trim().slice(0, 50),
      section: typeof section === 'string' ? section.trim().slice(0, 20) : '',
      guardianUserId: guardian._id,
      assignedBusId: bus._id
    });
    res.status(201).json({ id: student._id, name: student.name, email: student.email, className: student.className, section: student.section });
  } catch (error) { next(error); }
});

router.get('/students', async (req, res, next) => {
  try {
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    res.json(await User.find({ role: 'student', schoolId })
      .select('name email className section guardianUserId assignedBusId')
      .populate('guardianUserId', 'name email')
      .populate('assignedBusId', 'busNumber'));
  } catch (error) { next(error); }
});

router.get('/parents', async (req, res, next) => {
  try {
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    res.json(await User.find({ role: 'parent', schoolId }).select('name email schoolId assignedBusId'));
  }
  catch (error) { next(error); }
});

router.put('/parents/:id/assignment', async (req, res, next) => {
  try {
    const { busId } = req.body || {};
    if (!validId(req.params.id) || !validId(busId)) return res.status(400).json({ message: 'Select a valid parent and bus.' });
    const schoolId = adminSchool(req);
    if (!schoolId) return res.status(403).json({ message: 'This administrator is not linked to a school.' });
    const [parent, bus] = await Promise.all([
      User.findOne({ _id: req.params.id, role: 'parent', schoolId }),
      Bus.findOne({ _id: busId, schoolId }).populate('routeId')
    ]);
    if (!parent) return res.status(404).json({ message: 'Parent account not found.' });
    if (!bus) return res.status(404).json({ message: 'Bus not found.' });
    const route = bus.routeId;
    if (!route) return res.status(409).json({ message: 'Assign a route to this bus before assigning parents.' });
    if (route.schoolId !== schoolId) return res.status(403).json({ message: 'The bus belongs to a different school.' });
    if (parent.schoolId && String(parent.schoolId) !== String(route.schoolId)) {
      return res.status(403).json({ message: 'Parent and bus must belong to the same school.' });
    }
    parent.assignedBusId = bus._id;
    parent.schoolId = route.schoolId;
    await parent.save();
    res.json({ assigned: true, parentId: parent._id, busId: bus._id });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => {
  if (error.code === 11000) return res.status(409).json({ message: 'A record with that unique value already exists.' });
  res.status(error.status || 400).json({ message: error.message || 'Request could not be completed.' });
});
module.exports = router;
