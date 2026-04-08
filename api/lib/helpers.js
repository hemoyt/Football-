// Shared response helpers for Vercel serverless functions

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function ok(res, data, status = 200) {
  res.status(status).json(data !== undefined ? data : { success: true });
}

function err(res, message, status = 400) {
  res.status(status).json({ message });
}

// Wraps a handler with CORS + OPTIONS + error handling
function handle(methods, fn) {
  return async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    const allowed = Array.isArray(methods) ? methods : [methods];
    if (!allowed.includes(req.method)) return err(res, 'Method not allowed.', 405);
    try {
      await fn(req, res);
    } catch (e) {
      if (e && e.status) return err(res, e.message, e.status);
      console.error(e);
      return err(res, 'Internal server error.', 500);
    }
  };
}

module.exports = { setCors, ok, err, handle };
