import mongoose from 'mongoose';

const bakeryShopSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Shop name is required'],
            unique: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        balance: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);



export default mongoose.model('BakeryShop', bakeryShopSchema);
