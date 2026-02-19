const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/livecommerce')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Update user roles
    await User.updateOne({email: 'admin@test.com'}, {$set: {role: 'admin'}});
    console.log('✓ Updated admin@test.com to admin');
    
    await User.updateOne({email: 'seller@test.com'}, {$set: {role: 'seller'}});
    console.log('✓ Updated seller@test.com to seller');
    
    // Get stats
    const stats = {
      total: await User.countDocuments(),
      sellers: await User.countDocuments({role: 'seller'}),
      admins: await User.countDocuments({role: 'admin'}),
      regular: await User.countDocuments({role: 'user'})
    };
    
    console.log('\nCurrent Stats:');
    console.log(JSON.stringify(stats, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
