const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, imageUrl } = req.body;

        // Validate input
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate unique user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create new user
        const user = new User({
            id: userId,
            email,
            password,
            fullName,
            imageUrl: imageUrl || null
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                imageUrl: user.imageUrl,
                mobileNumber: user.mobileNumber,
                address: user.address,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
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

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                imageUrl: user.imageUrl,
                mobileNumber: user.mobileNumber,
                address: user.address,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user (protected route)
router.get('/me', requireAuth, async (req, res) => {
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
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Update user profile (protected route)
router.patch('/me', requireAuth, async (req, res) => {
    try {
        const { userId } = req.auth;
        const { fullName, imageUrl, email, mobileNumber, address } = req.body;

        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is being changed and if it's already taken
        if (email !== undefined && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            user.email = email;
        }

        if (fullName !== undefined) user.fullName = fullName;
        if (imageUrl !== undefined) user.imageUrl = imageUrl;
        if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
        if (address !== undefined) user.address = address;

        await user.save();

        res.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            imageUrl: user.imageUrl,
            mobileNumber: user.mobileNumber,
            address: user.address
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Logout (client-side only, but can be used for token blacklisting if needed)
router.post('/logout', requireAuth, (req, res) => {
    // In a JWT-based auth, logout is handled client-side by removing the token
    // This endpoint can be used for additional server-side cleanup if needed
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
