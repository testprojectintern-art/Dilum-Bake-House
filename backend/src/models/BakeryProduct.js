import mongoose from 'mongoose';

const bakeryProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            unique: true,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);



export default mongoose.model('BakeryProduct', bakeryProductSchema);
