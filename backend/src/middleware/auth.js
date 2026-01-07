import jwt from 'jsonwebtoken';
// dotenv.config() is called in app.js before this file is imported

const SECRET = process.env.JWT_SECRET || 'supersecret_change_me';

export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header' });
  }

  const token = parts[1];

  try {
    const payload = jwt.verify(token, SECRET);
    // MongoDB uses _id, but we store id in JWT for consistency
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    console.error('JWT verify error', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}