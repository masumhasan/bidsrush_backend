const express = require('express');
const router = express.Router();
const { requireSeller } = require('../middleware/adminAuth');
const User = require('../models/User');
const Stream = require('../models/Stream');
const Product = require('../models/Product');

/**
 * Seller Routes
 * All routes require seller, admin, or superadmin role
 */

// Get seller dashboard stats
router.get('/stats', requireSeller, async (req, res) => {
    try {
        const { userId, role } = req.auth;

        // Get seller's streams
        const totalStreams = await Stream.countDocuments({ hostId: userId });
        const activeStreams = await Stream.countDocuments({ 
            hostId: userId, 
            status: 'active' 
        });
        const recordedStreams = await Stream.countDocuments({ 
            hostId: userId, 
            'recording.fileName': { $exists: true } 
        });

        // Get seller's products
        const totalProducts = await Product.countDocuments({ sellerId: userId });

        // Get recent streams
        const recentStreams = await Stream.find({ hostId: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title status createdAt endedAt isRecordingEnabled');

        res.json({
            stats: {
                totalStreams,
                activeStreams,
                recordedStreams,
                totalProducts
            },
            recentStreams
        });
    } catch (error) {
        console.error('Error fetching seller stats:', error);
        res.status(500).json({ error: 'Failed to fetch seller statistics' });
    }
});

// Get seller's own streams
router.get('/my-streams', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;
        const { status, page = 1, limit = 10 } = req.query;

        const query = { hostId: userId };
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const streams = await Stream.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Stream.countDocuments(query);

        res.json({
            streams,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching seller streams:', error);
        res.status(500).json({ error: 'Failed to fetch streams' });
    }
});

// Get seller's own products
router.get('/my-products', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find({ sellerId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments({ sellerId: userId });

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching seller products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Update seller's own product
router.put('/products/:productId', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;
        const { productId } = req.params;
        const { name, description, price, imageUrl } = req.body;

        // Find product and verify ownership
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.sellerId !== userId) {
            return res.status(403).json({ error: 'Not authorized to update this product' });
        }

        // Update product
        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (imageUrl !== undefined) product.imageUrl = imageUrl;

        await product.save();

        res.json({ 
            message: 'Product updated successfully', 
            product 
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete seller's own product
router.delete('/products/:productId', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;
        const { productId } = req.params;

        // Find product and verify ownership
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.sellerId !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this product' });
        }

        await Product.findByIdAndDelete(productId);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get seller's recording analytics
router.get('/recordings', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;

        const recordings = await Stream.find({ 
            hostId: userId,
            'recording.fileName': { $exists: true } 
        })
        .sort({ 'recording.recordedAt': -1 })
        .select('title recording createdAt endedAt');

        const totalDuration = recordings.reduce((sum, stream) => {
            return sum + (stream.recording?.duration || 0);
        }, 0);

        const totalSize = recordings.reduce((sum, stream) => {
            return sum + (stream.recording?.fileSize || 0);
        }, 0);

        res.json({
            recordings: recordings.map(stream => ({
                streamId: stream._id,
                title: stream.title,
                duration: stream.recording.duration,
                fileSize: stream.recording.fileSize,
                recordedAt: stream.recording.recordedAt,
                fileName: stream.recording.fileName
            })),
            summary: {
                totalRecordings: recordings.length,
                totalDuration, // in seconds
                totalSize, // in bytes
                averageDuration: recordings.length > 0 ? totalDuration / recordings.length : 0
            }
        });
    } catch (error) {
        console.error('Error fetching seller recordings:', error);
        res.status(500).json({ error: 'Failed to fetch recordings' });
    }
});

// Get seller profile
router.get('/profile', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;

        const user = await User.findOne({ id: userId }).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching seller profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update seller profile
router.patch('/profile', requireSeller, async (req, res) => {
    try {
        const { userId } = req.auth;
        const { fullName, mobileNumber, address, imageUrl } = req.body;

        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields
        if (fullName !== undefined) user.fullName = fullName;
        if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
        if (address !== undefined) user.address = address;
        if (imageUrl !== undefined) user.imageUrl = imageUrl;

        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ 
            message: 'Profile updated successfully', 
            user: userResponse 
        });
    } catch (error) {
        console.error('Error updating seller profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
