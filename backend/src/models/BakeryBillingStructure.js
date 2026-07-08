import mongoose from 'mongoose';

const billingStructureSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Structure name is required'],
            unique: true,
            trim: true,
        },
        prices: [
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
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);



export default mongoose.model('BakeryBillingStructure', billingStructureSchema);
