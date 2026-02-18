const mongoose = require('mongoose');

const ProductCategorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true,
        trim: true
    },
    description: { 
        type: String,
        trim: true
    },
    imageUrl: { 
        type: String 
    },
    icon: {
        type: String // Icon name or emoji
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Update the updatedAt timestamp before saving
ProductCategorySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('ProductCategory', ProductCategorySchema);
