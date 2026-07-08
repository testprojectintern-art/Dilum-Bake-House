import mongoose from 'mongoose';

const bakeryInvoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        shopName: {
            type: String,
            required: true,
            trim: true,
        },
        shopPhone: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        structureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BakeryBillingStructure',
        },
        structureName: {
            type: String,
        },
        items: [
            {
                productName: {
                    type: String,
                    required: true,
                    trim: true,
                },
                price: {
                    type: Number,
                    required: true,
                    default: 0,
                },
                morningQty: {
                    type: Number,
                    default: 0,
                },
                afternoonQty: {
                    type: Number,
                    default: 0,
                },
                returnQty: {
                    type: Number,
                    default: 0,
                },
                subtotal: {
                    type: Number,
                    default: 0, // (morningQty + afternoonQty) * price
                },
                returnTotal: {
                    type: Number,
                    default: 0, // returnQty * price
                },
            },
        ],
        oldBalance: {
            type: Number,
            default: 0,
        },
        deliveredTotal: {
            type: Number,
            default: 0,
        },
        returnsTotal: {
            type: Number,
            default: 0,
        },
        grandTotal: {
            type: Number,
            default: 0, // oldBalance + deliveredTotal - returnsTotal
        },
        amountReceived: {
            type: Number,
            default: 0,
        },
        newBalance: {
            type: Number,
            default: 0, // grandTotal - amountReceived
        },
        specialNote: {
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

bakeryInvoiceSchema.index({ date: 1, shopName: 1 });


export default mongoose.model('BakeryInvoice', bakeryInvoiceSchema);
