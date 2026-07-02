import mongoose from 'mongoose';

const serialNumberSchema = new mongoose.Schema({
    serialNumber: { 
        type: String, 
        required: true, 
        unique: true, 
        uppercase: true, 
        trim: true 
    },
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    warehouseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Warehouse' 
    },
    status: { 
        type: String, 
        enum: ['in_stock', 'sold', 'returned_to_vendor', 'scrapped'], 
        default: 'in_stock' 
    },
    grnId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'GoodsReceiptNote' 
    },
    invoiceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Invoice' 
    },
    warrantyExpiryDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

serialNumberSchema.index({ productId: 1, status: 1 });
serialNumberSchema.index({ warehouseId: 1, status: 1 });

const SerialNumber = mongoose.model('SerialNumber', serialNumberSchema);
export default SerialNumber;
