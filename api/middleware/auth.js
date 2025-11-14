const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Admin privileges required'
    });
  }
  next();
}

// Middleware to check if user is admin or cashier
function requireCashierOrAdmin(req, res, next) {
  if (!['ADMIN', 'CASHIER'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Cashier or admin privileges required'
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireCashierOrAdmin
};