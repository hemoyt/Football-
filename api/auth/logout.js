const { handle, ok } = require('../lib/helpers');

// JWT is stateless — logout is handled client-side by deleting the token.
// This endpoint exists to keep API compatibility.
module.exports = handle(['POST', 'GET'], async (req, res) => {
  return ok(res, { success: true });
});
