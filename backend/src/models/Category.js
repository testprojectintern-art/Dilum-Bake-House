import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
            maxlength: 100,
        },
        code: {
            type: String,
            required: [true, 'Category code is required'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: 20,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        type: {
            type: String,
            enum: ['product', 'raw_material', 'both'],
            default: 'product',
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Index for search performance
categorySchema.index({ name: 'text', code: 'text' });
categorySchema.index({ parentCategory: 1, isActive: 1 });

// Auto-filter soft-deleted
categorySchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;