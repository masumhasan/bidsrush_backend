const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const requireAuth = require('../middleware/auth');

// In-Memory Storage for Fallback
let localProducts = [];

// Create Product
router.post('/', requireAuth, async (req, res) => {
    const { userId } = req.auth;
    const { name, description, price, imageUrl } = req.body;

    try {
        if (mongoose.connection.readyState === 1) {
            const product = new Product({
                name,
                description,
                price,
                imageUrl,
                sellerId: userId
            });

            await product.save();
            return res.status(201).json(product);
        } else {
            // Provide a more descriptive error message based on the readyState
            const dbState = mongoose.connection.readyState;
            let errorMessage = `Database not connected. Current state: ${dbState}.`;
            if (dbState === 0) errorMessage += ' (Disconnected)';
            if (dbState === 2) errorMessage += ' (Connecting)';
            if (dbState === 3) errorMessage += ' (Disconnecting)';
            if (dbState === 99) errorMessage += ' (Uninitialized)';
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.warn('Database error, falling back to in-memory:', error.message);
        const product = {
            _id: new Date().toISOString(), // Mock ID
            name,
            description,
            price,
            imageUrl,
            sellerId: userId,
            createdAt: new Date()
        };
        localProducts.push(product);
        return res.status(201).json(product);
    }
});

// List All Products
router.get('/', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const products = await Product.find().sort({ createdAt: -1 });
            return res.json(products);
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.warn('Database error, falling back to in-memory:', error.message);
        return res.json(localProducts.sort((a, b) => b.createdAt - a.createdAt));
    }
});

module.exports = router;
