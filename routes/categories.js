const express = require('express');
const router = express.Router();
const ProductCategory = require('../models/ProductCategory');
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/adminAuth');

/**
 * GET /api/categories
 * Get all categories (public)
 */
router.get('/', async (req, res) => {
    try {
        const { active } = req.query;
        
        const query = {};
        if (active === 'true') {
            query.isActive = true;
        }

        const categories = await ProductCategory.find(query).sort({ sortOrder: 1, name: 1 });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * GET /api/categories/:id
 * Get single category by ID (public)
 */
router.get('/:id', async (req, res) => {
    try {
        const category = await ProductCategory.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});

/**
 * POST /api/categories
 * Create new category (admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, description, imageUrl, icon, sortOrder } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Check if category with same name already exists
        const existingCategory = await ProductCategory.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });

        if (existingCategory) {
            return res.status(400).json({ error: 'Category with this name already exists' });
        }

        const category = new ProductCategory({
            name,
            description,
            imageUrl,
            icon,
            sortOrder: sortOrder || 0
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

/**
 * PUT /api/categories/:id
 * Update category (admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { name, description, imageUrl, icon, isActive, sortOrder } = req.body;

        const category = await ProductCategory.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // If name is being changed, check for duplicates
        if (name && name !== category.name) {
            const existingCategory = await ProductCategory.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({ error: 'Category with this name already exists' });
            }
            category.name = name;
        }

        if (description !== undefined) category.description = description;
        if (imageUrl !== undefined) category.imageUrl = imageUrl;
        if (icon !== undefined) category.icon = icon;
        if (isActive !== undefined) category.isActive = isActive;
        if (sortOrder !== undefined) category.sortOrder = sortOrder;

        await category.save();
        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

/**
 * DELETE /api/categories/:id
 * Delete category (admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const category = await ProductCategory.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if any products are using this category
        const productsCount = await Product.countDocuments({ categoryId: req.params.id });

        if (productsCount > 0) {
            return res.status(400).json({ 
                error: `Cannot delete category. ${productsCount} product(s) are using this category.`,
                productsCount
            });
        }

        await ProductCategory.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

/**
 * GET /api/categories/:id/products
 * Get all products in a category (public)
 */
router.get('/:id/products', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const category = await ProductCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find({ 
            categoryId: req.params.id,
            isActive: true 
        })
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

        const total = await Product.countDocuments({ 
            categoryId: req.params.id,
            isActive: true 
        });

        res.json({
            category: {
                id: category._id,
                name: category.name,
                description: category.description,
                imageUrl: category.imageUrl,
                icon: category.icon
            },
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching category products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

/**
 * GET /api/categories/stats
 * Get category statistics (admin only)
 */
router.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const totalCategories = await ProductCategory.countDocuments();
        const activeCategories = await ProductCategory.countDocuments({ isActive: true });

        // Get product count per category
        const categoriesWithCounts = await Product.aggregate([
            {
                $group: {
                    _id: '$categoryId',
                    productCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'productcategories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $project: {
                    categoryId: '$_id',
                    categoryName: '$category.name',
                    productCount: 1
                }
            },
            {
                $sort: { productCount: -1 }
            }
        ]);

        res.json({
            totalCategories,
            activeCategories,
            categoriesWithCounts
        });
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
