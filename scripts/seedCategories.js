/**
 * Seed default product categories
 * Run this script to populate the database with initial categories
 */

const mongoose = require('mongoose');
const ProductCategory = require('../models/ProductCategory');

const defaultCategories = [
    {
        name: 'Electronics',
        description: 'Phones, laptops, gadgets, and tech accessories',
        icon: '📱',
        sortOrder: 1,
        isActive: true
    },
    {
        name: 'Fashion',
        description: 'Clothing, shoes, accessories, and apparel',
        icon: '👗',
        sortOrder: 2,
        isActive: true
    },
    {
        name: 'Home & Garden',
        description: 'Furniture, decor, tools, and garden supplies',
        icon: '🏡',
        sortOrder: 3,
        isActive: true
    },
    {
        name: 'Beauty & Health',
        description: 'Cosmetics, skincare, wellness, and personal care',
        icon: '💄',
        sortOrder: 4,
        isActive: true
    },
    {
        name: 'Sports & Outdoors',
        description: 'Fitness equipment, outdoor gear, and sporting goods',
        icon: '⚽',
        sortOrder: 5,
        isActive: true
    },
    {
        name: 'Toys & Games',
        description: 'Kids toys, board games, and entertainment',
        icon: '🎮',
        sortOrder: 6,
        isActive: true
    },
    {
        name: 'Books & Media',
        description: 'Books, music, movies, and digital content',
        icon: '📚',
        sortOrder: 7,
        isActive: true
    },
    {
        name: 'Food & Beverages',
        description: 'Groceries, snacks, drinks, and gourmet items',
        icon: '🍔',
        sortOrder: 8,
        isActive: true
    }
];

async function seedCategories() {
    try {
        console.log('Connecting to MongoDB...');
        
        const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://staadmin:mrDnD7pqRJfS8e7a@teststa.urywcyb.mongodb.net/?appName=TestSTA';
        
        await mongoose.connect(mongoUrl);
        console.log('✓ Connected to MongoDB');

        // Check if categories already exist
        const existingCount = await ProductCategory.countDocuments();
        
        if (existingCount > 0) {
            console.log(`\n⚠ Database already has ${existingCount} categories.`);
            console.log('Do you want to clear existing categories and reseed? (y/n)');
            
            // For automated scripts, just skip if categories exist
            console.log('Skipping seed - categories already exist.');
            await mongoose.disconnect();
            return;
        }

        console.log('\nSeeding product categories...');
        
        for (const categoryData of defaultCategories) {
            const category = new ProductCategory(categoryData);
            await category.save();
            console.log(`✓ Created category: ${category.name}`);
        }

        console.log(`\n✓ Successfully seeded ${defaultCategories.length} categories!`);
        
        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');
        
    } catch (error) {
        console.error('Error seeding categories:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    seedCategories();
}

module.exports = seedCategories;
