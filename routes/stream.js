const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const streamClient = require('../lib/stream');
const Stream = require('../models/Stream');
const requireAuth = require('../middleware/auth');

// In-Memory Storage for Fallback
let localStreams = [];

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../recordings');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.params.callId}-${Date.now()}.webm`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Get Stream Token
router.get('/token', requireAuth, async (req, res) => {
    try {
        const { userId } = req.auth;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const token = streamClient.createToken(userId);
        res.json({ token, apiKey: process.env.STREAM_API_KEY });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

// Create Stream (Start Broadcast)
router.post('/', requireAuth, async (req, res) => {
    const { userId } = req.auth;
    const { callId, title, isRecordingEnabled } = req.body;

    if (!callId || !title) {
        return res.status(400).json({ error: 'Missing callId or title' });
    }

    try {
        // Check if DB is connected (readyState 1 = connected)
        if (mongoose.connection.readyState === 1) {
            const stream = new Stream({
                callId,
                hostId: userId,
                title,
                isRecordingEnabled: isRecordingEnabled || false
            });
            await stream.save();
            return res.status(201).json(stream);
        } else {
            // Explicitly throw to trigger catch block for fallback
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.warn('Database error, falling back to in-memory:', error.message);
        const stream = {
            _id: new Date().toISOString(), // Mock ID
            callId,
            hostId: userId,
            title,
            isRecordingEnabled: isRecordingEnabled || false,
            status: 'active',
            createdAt: new Date()
        };
        localStreams.push(stream);
        return res.status(201).json(stream);
    }
});

// List Active Streams
router.get('/', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const streams = await Stream.find({ status: 'active' }).sort({ createdAt: -1 });
            return res.json(streams);
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.warn('Database error, falling back to in-memory:', error.message);
        return res.json(localStreams.filter(s => s.status === 'active').sort((a, b) => b.createdAt - a.createdAt));
    }
});

// Get Stream Details
router.get('/:callId', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const stream = await Stream.findOne({ callId: req.params.callId });
            if (!stream) return res.status(404).json({ error: 'Stream not found' });
            return res.json(stream);
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.warn('Database error, falling back to in-memory:', error.message);
        const stream = localStreams.find(s => s.callId === req.params.callId);
        if (!stream) return res.status(404).json({ error: 'Stream not found' });
        return res.json(stream);
    }
});

// End Stream
router.post('/:callId/end', requireAuth, async (req, res) => {
    const { userId } = req.auth;
    const { callId } = req.params;
    try {
        if (mongoose.connection.readyState === 1) {
            const stream = await Stream.findOne({ callId, hostId: userId });
            if (!stream) return res.status(404).json({ error: 'Stream not found or unauthorized' });

            stream.status = 'ended';
            stream.endedAt = new Date();
            await stream.save();
            return res.json(stream);
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        // Fallback for memory mode
        const stream = localStreams.find(s => s.callId === callId && s.hostId === userId);
        if (stream) {
            stream.status = 'ended';
            stream.endedAt = new Date();
            return res.json(stream);
        }
        res.status(404).json({ error: 'Stream not found or unauthorized' });
    }
});

// Upload Recording
router.post('/:callId/recording', requireAuth, upload.single('video'), async (req, res) => {
    const { userId } = req.auth;
    const { callId } = req.params;
    const { duration } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }

    try {
        if (mongoose.connection.readyState === 1) {
            console.log('💾 Finding stream for recording upload:', { callId, userId });
            
            const stream = await Stream.findOne({ callId, hostId: userId });
            if (!stream) {
                console.log('❌ Stream not found for callId:', callId);
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ error: 'Stream not found or unauthorized' });
            }

            console.log('✅ Stream found:', stream.callId, '- isRecordingEnabled:', stream.isRecordingEnabled);

            // Verify recording was enabled
            if (!stream.isRecordingEnabled) {
                fs.unlinkSync(req.file.path);
                return res.status(403).json({ error: 'Recording was not enabled for this stream' });
            }

            stream.recording = {
                fileName: req.file.filename,
                filePath: req.file.path,
                duration: parseInt(duration) || 0,
                fileSize: req.file.size,
                recordedAt: new Date()
            };
            
            // Ensure stream is marked as ended
            if (stream.status !== 'ended') {
                stream.status = 'ended';
                stream.endedAt = new Date();
            }
            
            console.log('💾 Saving recording metadata:', stream.recording);
            await stream.save();
            console.log('✅ Recording saved to DB successfully');

            console.log(`✅ Recording saved: ${req.file.filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);
            return res.json({ 
                success: true, 
                recording: stream.recording 
            });
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.error('Error saving recording:', error);
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to save recording' });
    }
});

// Get Recorded Streams
router.get('/recorded', requireAuth, async (req, res) => {
    const { userId } = req.query;

    try {
        if (mongoose.connection.readyState === 1) {
            console.log('🔍 DB CONNECTED - Querying recorded streams');
            console.log('🔍 Filter userId:', userId || 'ALL');
            
            const query = { 
                'recording.fileName': { $exists: true, $ne: null }
            };
            
            // Filter by specific user if userId is provided
            if (userId) {
                query.hostId = userId;
            }

            console.log('🔍 Query:', JSON.stringify(query));
            
            const streams = await Stream.find(query).sort({ 'recording.recordedAt': -1 });
            
            console.log(`🔍 FOUND ${streams.length} recorded streams`);
            if (streams.length > 0) {
                streams.forEach(s => {
                    console.log(`  - ${s.callId}: ${s.title} (file: ${s.recording?.fileName})`);
                });
            } else {
                // Check if there are ANY streams at all
                const allStreams = await Stream.find({});
                console.log(`🔍 Total streams in DB: ${allStreams.length}`);
                if (allStreams.length > 0) {
                    allStreams.forEach(s => {
                        console.log(`  - ${s.callId}: recording=${!!s.recording}, fileName=${s.recording?.fileName}`);
                    });
                }
            }
            
            return res.json(streams);
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.error('Error fetching recorded streams:', error);
        res.status(500).json({ error: 'Failed to fetch recorded streams' });
    }
});

// Serve Recording Video
router.get('/:callId/recording/video', async (req, res) => {
    const { callId } = req.params;

    try {
        if (mongoose.connection.readyState === 1) {
            const stream = await Stream.findOne({ callId });
            if (!stream || !stream.recording || !stream.recording.filePath) {
                return res.status(404).json({ error: 'Recording not found' });
            }

            const videoPath = stream.recording.filePath;
            if (!fs.existsSync(videoPath)) {
                return res.status(404).json({ error: 'Recording file not found on server' });
            }

            // Set proper headers for video streaming
            const stat = fs.statSync(videoPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(videoPath, { start, end });
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/webm',
                };
                res.writeHead(206, head);
                file.pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/webm',
                };
                res.writeHead(200, head);
                fs.createReadStream(videoPath).pipe(res);
            }
        } else {
            throw new Error('Database not connected');
        }
    } catch (error) {
        console.error('Error serving recording:', error);
        res.status(500).json({ error: 'Failed to serve recording' });
    }
});

module.exports = router;
