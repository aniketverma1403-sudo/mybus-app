const jwt = require('jsonwebtoken');

function auth(requiredRoles = []) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(decoded.role)) return res.status(403).json({ message: 'Insufficient permissions' });
      req.user = decoded;
      next();
    } catch (_error) {
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

module.exports = auth;
