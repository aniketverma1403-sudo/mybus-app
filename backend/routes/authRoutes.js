const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

// Public registration creates parent accounts only. School membership and bus assignment
// must be verified and set by an administrator; never trust a client-supplied schoolId.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() ||
        typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 8 characters are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({
      name: name.trim().slice(0, 100),
      email: normalizedEmail,
      password,
      role: 'parent'
    });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).populate('assignedBusId');
    if (!user) return res.sendStatus(404);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || null,
      assignedBusId: user.assignedBusId
    });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured on the server.' });
    const token = jwt.sign(
      { sub: String(user._id), role: user.role, name: user.name, schoolId: user.schoolId || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || null,
        assignedBusId: user.assignedBusId || null
      }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.use((error, _req, res, _next) => {
  res.status(error.status || 400).json({ message: error.message || 'Request could not be completed.' });
});
module.exports = router;
