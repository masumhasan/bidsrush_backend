const User = require('../models/User');

/**
 * Seed superadmin user if not exists
 * Called on server startup
 */
const seedSuperAdmin = async () => {
    try {
        const superadminEmail = process.env.SUPERADMIN_EMAIL || 'tss.sta.gpt@gmail.com';
        const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'Test@123';

        // Check if user with this email already exists
        const existingUser = await User.findOne({ email: superadminEmail });

        if (existingUser) {
            // If user exists but is not superadmin, upgrade to superadmin
            if (existingUser.role !== 'superadmin') {
                existingUser.role = 'superadmin';
                await existingUser.save();
                console.log('✅ Existing user upgraded to superadmin role');
                return;
            }
            console.log('✅ Superadmin user already exists');
            return;
        }

        // Check if ANY superadmin exists
        const anySuperadmin = await User.findOne({ role: 'superadmin' });
        if (anySuperadmin) {
            console.log('✅ A superadmin user already exists in the system');
            return;
        }

        // Generate unique user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create superadmin user
        const superadmin = new User({
            id: userId,
            email: superadminEmail,
            password: superadminPassword,
            fullName: 'Super Administrator',
            role: 'superadmin',
            imageUrl: null
        });

        await superadmin.save();

        console.log('✅ Superadmin user created successfully');
        console.log(`   Email: ${superadminEmail}`);
        console.log(`   Role: superadmin`);
        console.log('⚠️  IMPORTANT: Change the superadmin password immediately after first login!');
    } catch (error) {
        // Silently handle duplicate key errors
        if (error.code === 11000) {
            console.log('✅ Superadmin user already exists');
            return;
        }
        console.error('❌ Error seeding superadmin:', error);
    }
};

module.exports = seedSuperAdmin;
