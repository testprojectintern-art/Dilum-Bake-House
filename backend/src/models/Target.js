import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
    targetType: {
        type: String,
        enum: ['monthly', 'annual'],
        required: true
    },
    year: {
        type: Number,
        required: true // e.g., 2026
    },
    month: {
        type: Number, // 1 to 12 (required if targetType is monthly)
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false // if null, it's a general sales target for the whole business
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 0
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Ensure unique target configuration per time period and product
targetSchema.index({ targetType: 1, year: 1, month: 1, productId: 1 }, { unique: true });

const Target = mongoose.model('Target', targetSchema);
export default Target;
