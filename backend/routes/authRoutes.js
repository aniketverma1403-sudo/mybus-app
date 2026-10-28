const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

// Public registration creates parent accounts only; clients cannot self-assign roles or buses.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, schoolId } = req.body;
    if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 8 characters are required.' });
    }
    const user = await User.create({
      name: name.trim(), email: email.trim().toLowerCase(), password, role: 'parent',
      schoolId: typeof schoolId === 'string' ? schoolId.trim() : undefined
    });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).populate('assignedBusId');
    if (!user) return res.sendStatus(404);
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, assignedBusId: user.assignedBusId });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(typeof password === 'string' ? password : '', user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured on the server.' });
    const token = jwt.sign({ sub: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, assignedBusId: user.assignedBusId } });
  } catch (error) { next(error); }
});

router.use((error, _req, res, _next) => {
  const status = error.code === 11000 ? 409 : 400;
  res.status(status).json({ message: error.code === 11000 ? 'An account with this email already exists.' : error.message });
});
module.exports = router;
