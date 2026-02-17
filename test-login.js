require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://staadmin:mrDnD7pqRJfS8e7a@teststa.urywcyb.mongodb.net/?appName=TestSTA';

mongoose.connect(mongoUrl)
    .then(async () => {
        console.log('MongoDB Connected');
        
        const user = await User.findOne({ email: 'tss.sta.gpt@gmail.com' });
        
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }
        
        console.log('\n✅ User found:');
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Full Name:', user.fullName);
        console.log('Password hash (first 30 chars):', user.password.substring(0, 30) + '...');
        
        // Test password
        const testPassword = 'Test@123';
        console.log('\n🔍 Testing password:', testPassword);
        
        const isValid = await user.comparePassword(testPassword);
        console.log('Password valid:', isValid ? '✅ YES' : '❌ NO');
        
        if (!isValid) {
            console.log('\n⚠️  Password mismatch detected!');
            console.log('Attempting to reset password to Test@123...');
            
            user.password = testPassword;
            await user.save();
            
            console.log('✅ Password reset successful');
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
