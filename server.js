require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.set('debug', true);
const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://staadmin:mrDnD7pqRJfS8e7a@teststa.urywcyb.mongodb.net/?appName=TestSTA';

console.log('Attempting to connect to MongoDB...', mongoUrl.replace(/:([^:@]{1,})@/, ':****@'));

mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
})
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => {
        console.warn('MongoDB Connection Failed (Falling back to in-memory mode):', err.message);
        // Do not exit process, let the app run with in-memory fallback
    });

// Routes
const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/stream');
const productRoutes = require('./routes/products');

app.use('/api/auth', authRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
    res.send('Live Commerce Backend Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
    console.warn('Keeping server alive despite unhandled rejection');
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.warn('Keeping server alive despite uncaught exception');
});
