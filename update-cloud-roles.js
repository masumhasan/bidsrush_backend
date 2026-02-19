require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://staadmin:mrDnD7pqRJfS8e7a@teststa.urywcyb.mongodb.net/?appName=TestSTA';

mongoose.connect(mongoUrl)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    
    // List all users
    const allUsers = await User.find({});
    console.log(`\nFound ${allUsers.length} users:`);
    allUsers.forEach(u => {
      console.log(`- ${u.email} (role: ${u.role})`);
    });
    
    // Update user roles
    const adminUpdate = await User.updateOne({email: 'admin@test.com'}, {$set: {role: 'admin'}});
    console.log(`\nAdmin update result: ${adminUpdate.modifiedCount} modified`);
    
    const sellerUpdate = await User.updateOne({email: 'seller@test.com'}, {$set: {role: 'seller'}});
    console.log(`Seller update result: ${sellerUpdate.modifiedCount} modified`);
    
    // Get updated stats
    const stats = {
      total: await User.countDocuments(),
      sellers: await User.countDocuments({role: 'seller'}),
      admins: await User.countDocuments({role: 'admin'}),
      regular: await User.countDocuments({role: 'user'})
    };
    
    console.log('\nUpdated Stats:');
    console.log(JSON.stringify(stats, null, 2));
    
    // List users again
    const updatedUsers = await User.find({});
    console.log(`\nUpdated users:`);
    updatedUsers.forEach(u => {
      console.log(`- ${u.email} (role: ${u.role})`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
