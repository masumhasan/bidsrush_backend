const mongoose = require('mongoose');

const StreamSchema = new mongoose.Schema({
    callId: { type: String, required: true, unique: true },
    hostId: { type: String, required: true }, // Clerk User ID
    title: { type: String, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    isRecordingEnabled: { type: Boolean, default: false },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    recording: {
        fileName: String,
        filePath: String,
        duration: Number, // in seconds
        fileSize: Number, // in bytes
        recordedAt: Date,
        thumbnailUrl: String
    },
    createdAt: { type: Date, default: Date.now },
    endedAt: Date
});

module.exports = mongoose.model('Stream', StreamSchema);
