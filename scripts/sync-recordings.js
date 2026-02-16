require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Stream = require('../models/Stream');

async function syncRecordings() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://staadmin:mrDnD7pqRJfS8e7a@teststa.urywcyb.mongodb.net/?appName=TestSTA';
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const recordingsDir = path.join(__dirname, '../recordings');
    
    // Check if recordings directory exists
    if (!fs.existsSync(recordingsDir)) {
      console.log('❌ Recordings directory does not exist:', recordingsDir);
      process.exit(1);
    }

    // Get all video files from recordings folder
    const files = fs.readdirSync(recordingsDir)
      .filter(file => file.endsWith('.webm') || file.endsWith('.mp4'));

    console.log(`\n📹 Found ${files.length} recording files\n`);

    if (files.length === 0) {
      console.log('No recording files to sync.');
      process.exit(0);
    }

    let synced = 0;
    let notFound = 0;

    for (const filename of files) {
      // Extract callId from filename (format: callId-timestamp.webm or stream-timestamp1-timestamp2.webm)
      let callId;
      let duration = 0;
      
      // Try to extract callId from filename patterns
      if (filename.includes('-')) {
        const parts = filename.split('-');
        // If format is stream-timestamp1-timestamp2.webm
        if (parts[0] === 'stream' && parts.length >= 3) {
          callId = `stream-${parts[1]}`;
          
          // Calculate duration from timestamps in filename
          const startTime = parseInt(parts[1]);
          const endTimeStr = parts[2].split('.')[0]; // Remove .webm extension
          const endTime = parseInt(endTimeStr);
          
          if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
            duration = Math.floor((endTime - startTime) / 1000); // Convert to seconds
            console.log(`⏱️  Calculated duration: ${duration}s (${Math.floor(duration / 60)}m ${duration % 60}s)`);
          }
        } else {
          // If format is callId-timestamp.webm
          callId = parts[0];
        }
      } else {
        callId = filename.split('.')[0];
      }
      
      console.log(`🔍 Looking for stream with callId: ${callId}`);
      
      const stream = await Stream.findOne({ callId });
      
      if (stream) {
        const filePath = path.join(recordingsDir, filename);
        const stats = fs.statSync(filePath);
        
        // Update stream with recording info
        stream.status = 'ended';
        stream.endedAt = stream.endedAt || new Date(stats.mtime);
        stream.recording = {
          fileName: filename,
          filePath: filePath,
          duration: duration,
          fileSize: stats.size,
          recordedAt: new Date(stats.mtime)
        };
        
        await stream.save();
        synced++;
        console.log(`✅ Synced: ${callId} -> ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${duration}s)`);
      } else {
        notFound++;
        console.log(`❌ No stream found for callId: ${callId} (file: ${filename})`);
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ❌ Not Found: ${notFound}`);
    console.log(`   📂 Total Files: ${files.length}`);
    console.log('\n✨ Sync complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync error:', error);
    process.exit(1);
  }
}

syncRecordings();
