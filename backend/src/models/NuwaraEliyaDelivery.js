import mongoose from 'mongoose';

const nuwaraEliyaDeliverySchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            required: true,
            unique: true,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        // Loaded Products (Cost of products given)
        loadedItems: [
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
                qty: {
                    type: Number,
                    required: true,
                    default: 0,
                },
            },
        ],
        loadCost: {
            type: Number,
            required: true,
            default: 0,
        },
        // Previous unpaid outstanding balance from last trip
        previousOutstanding: {
            type: Number,
            required: true,
            default: 0,
        },
        previousOnBoardStockCost: {
            type: Number,
            required: true,
            default: 0,
        },
        previousShopsOutstanding: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            required: true,
            enum: ['loaded', 'settled'],
            default: 'loaded',
        },
        // Deductions
        bankDeposits: {
            type: Number,
            required: true,
            default: 0,
        },
        returnedItems: [
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
                qty: {
                    type: Number,
                    required: true,
                    default: 0,
                },
            },
        ],
        returnsCost: {
            type: Number,
            required: true,
            default: 0,
        },
        onBoardItems: [
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
                qty: {
                    type: Number,
                    required: true,
                    default: 0,
                },
            },
        ],
        onBoardStockCost: {
            type: Number,
            required: true,
            default: 0,
        },
        shopsOutstanding: {
            type: Number,
            required: true,
            default: 0,
        },
        // Calculations
        netOutstanding: {
            type: Number,
            required: true,
            default: 0, // (loadCost + previousOutstanding) - (bankDeposits + returnsCost + onBoardStockCost + shopsOutstanding)
        },
        amountPaid: {
            type: Number,
            required: true,
            default: 0,
        },
        nextOutstanding: {
            type: Number,
            required: true,
            default: 0, // netOutstanding - amountPaid
        },
        specialRemarks: {
            type: String,
            trim: true,
        },
        structureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BakeryStructure',
        },
        structureName: {
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

export default mongoose.model('NuwaraEliyaDelivery', nuwaraEliyaDeliverySchema);
