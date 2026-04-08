// JWT authentication helpers
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'gog-dev-secret-change-in-production';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function getToken(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Returns decoded payload or throws { status, message }
function requireAuth(req, role) {
  const token = getToken(req);
  if (!token) throw { status: 401, message: 'Authentication required.' };
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw { status: 401, message: 'Invalid or expired token.' };
  }
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(payload.role)) throw { status: 403, message: 'Insufficient permissions.' };
  }
  return payload;
}

module.exports = { signToken, verifyToken, getToken, requireAuth };
