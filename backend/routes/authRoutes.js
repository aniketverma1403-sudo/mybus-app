const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'parent', schoolId, assignedBusId } = req.body;
    if (!['admin', 'driver', 'parent'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.create({ name, email, password, role, schoolId, assignedBusId });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) { next(error); }
});

router.get('/me', require('../middleware/auth')(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).populate('assignedBusId');
    if (!user) return res.sendStatus(404);
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, assignedBusId: user.assignedBusId });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign({ sub: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, assignedBusId: user.assignedBusId } });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => {
  const status = error.code === 11000 ? 409 : 400;
  res.status(status).json({ message: error.message });
});

module.exports = router;
