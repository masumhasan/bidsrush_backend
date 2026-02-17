const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/admin/login
 * Admin login - only allows admin and superadmin roles
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if user has admin or superadmin role
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ 
                error: 'Access denied. Admin privileges required.' 
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token with role
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                imageUrl: user.imageUrl,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/admin/me
 * Get current admin user
 */
router.get('/me', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.auth;
        
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            imageUrl: user.imageUrl,
            role: user.role
        });
    } catch (error) {
        console.error('Get admin user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * GET /api/admin/users
 * Get all users (admin & superadmin only)
 */
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = '' } = req.query;
        
        // Build query
        const query = {};
        
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role && ['user', 'admin', 'superadmin'].includes(role)) {
            query.role = role;
        }

        // Calculate skip
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get users
        const users = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Get total count
        const total = await User.countDocuments(query);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

/**
 * GET /api/admin/users/:userId
 * Get specific user details
 */
router.get('/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findOne({ id: userId }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * PUT /api/admin/assign-role/:userId
 * Assign role to user (superadmin only)
 */
router.put('/assign-role/:userId', requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        // Validate role
        if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
            return res.status(400).json({ 
                error: 'Invalid role. Must be: user, admin, or superadmin' 
            });
        }

        // Find target user
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent demoting yourself as superadmin
        if (req.auth.userId === userId && role !== 'superadmin') {
            return res.status(400).json({ 
                error: 'Cannot demote yourself from superadmin role' 
            });
        }

        // Update role
        user.role = role;
        await user.save();

        res.json({
            message: 'Role updated successfully',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({ error: 'Failed to assign role' });
    }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        // Get user counts
        const totalUsers = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        const superadminCount = await User.countDocuments({ role: 'superadmin' });
        const regularUserCount = await User.countDocuments({ role: 'user' });

        // Get recent users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await User.countDocuments({ 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        res.json({
            users: {
                total: totalUsers,
                admins: adminCount,
                superadmins: superadminCount,
                regular: regularUserCount,
                recent: recentUsers
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete user (superadmin only)
 */
router.delete('/users/:userId', requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting yourself
        if (req.auth.userId === userId) {
            return res.status(400).json({ 
                error: 'Cannot delete your own account' 
            });
        }

        const user = await User.findOneAndDelete({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
