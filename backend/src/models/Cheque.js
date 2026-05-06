import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const chequeSchema = new mongoose.Schema({
    chequeNumber: { type: String, required: true, trim: true },
    chequeDate: { type: Date, required: true },
    
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'LKR' },
    
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
    
    payeeName: String, // Who the cheque is written to (for outgoing) or from (for incoming)
    
    direction: {
        type: String,
        enum: ['incoming', 'outgoing'],
        required: true,
    },
    
    status: {
        type: String,
        enum: ['pending', 'deposited', 'cleared', 'bounced', 'cancelled', 'returned'],
        default: 'pending',
    },
    
    // Links
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    
    depositedBankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    clearedDate: Date,
    bouncedDate: Date,
    bouncedReason: String,
    
    notes: String,
    imageUrls: [String],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

chequeSchema.index({ chequeNumber: 1, bankName: 1 }, { unique: true });
chequeSchema.index({ status: 1 });
chequeSchema.index({ chequeDate: 1 });

chequeSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Cheque = mongoose.model('Cheque', chequeSchema);
export default Cheque;
