const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to require admin or superadmin role
 * Must be used after requireAuth middleware
 */
const requireAdmin = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from database to get role
        const user = await User.findOne({ id: decoded.userId });
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user has admin or superadmin role
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ 
                error: 'Access denied. Admin privileges required.' 
            });
        }

        // Add user info to request object
        req.auth = {
            userId: decoded.userId,
            email: decoded.email,
            role: user.role
        };

        req.user = user; // Full user object for convenience

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to require superadmin role only
 * Must be used after requireAuth middleware
 */
const requireSuperAdmin = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from database to get role
        const user = await User.findOne({ id: decoded.userId });
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user has superadmin role
        if (user.role !== 'superadmin') {
            return res.status(403).json({ 
                error: 'Access denied. Superadmin privileges required.' 
            });
        }

        // Add user info to request object
        req.auth = {
            userId: decoded.userId,
            email: decoded.email,
            role: user.role
        };

        req.user = user; // Full user object for convenience

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to require seller role or higher (seller, admin, superadmin)
 * Must be used after requireAuth middleware
 */
const requireSeller = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from database to get role
        const user = await User.findOne({ id: decoded.userId });
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user has seller, admin, or superadmin role
        const allowedRoles = ['seller', 'admin', 'superadmin'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                error: 'Access denied. Seller privileges required.' 
            });
        }

        // Add user info to request object
        req.auth = {
            userId: decoded.userId,
            email: decoded.email,
            role: user.role
        };

        req.user = user; // Full user object for convenience

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = {
    requireAdmin,
    requireSuperAdmin,
    requireSeller
};
