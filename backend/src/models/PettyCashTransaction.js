import mongoose from 'mongoose';

const pettyCashTransactionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    transactionType: {
        type: String,
        enum: ['fund', 'expense'], // 'fund' = Cash top-up (cash-in), 'expense' = Cash spending (cash-out)
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    category: {
        type: String, // e.g., 'Office Supplies', 'Refreshments', 'Transport', 'Top-up'
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    reference: {
        type: String, // e.g., receipt or voucher number
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Auto-filter soft-deleted
pettyCashTransactionSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const PettyCashTransaction = mongoose.model('PettyCashTransaction', pettyCashTransactionSchema);
export default PettyCashTransaction;
