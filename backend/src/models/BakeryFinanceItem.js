import mongoose from 'mongoose';

const bakeryFinanceItemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        type: {
            type: String,
            required: [true, 'Type is required'],
            enum: ['piti_cheque', 'vehicle_fuel', 'vehicle_finance', 'vehicle_insurance', 'vehicle_license', 'utility_bill', 'other'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending',
        },
        alertSent: {
            type: Boolean,
            default: false,
        },
        paymentSourceType: {
            type: String,
            enum: ['bank_account', 'shop_collection', 'cash_drawer', 'none'],
            default: 'none',
        },
        paymentSourceId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'paymentSourceTypeRef',
        },
        chequeNumber: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

// Dynamic ref path helper
bakeryFinanceItemSchema.virtual('paymentSourceTypeRef').get(function() {
    if (this.paymentSourceType === 'bank_account') return 'BankAccount';
    if (this.paymentSourceType === 'shop_collection') return 'BakeryShop';
    return null;
});

export default mongoose.model('BakeryFinanceItem', bakeryFinanceItemSchema);
