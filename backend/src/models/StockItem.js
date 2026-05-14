import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        variationId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        productCode: { type: String, trim: true }, // denormalized
        productName: { type: String, trim: true }, // denormalized

        warehouseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: true,
        },

        // Batch tracking (optional — only if product has it)
        batchNumber: { type: String, trim: true, default: null },
        manufactureDate: { type: Date, default: null },
        expiryDate: { type: Date, default: null },

        quantities: {
            onHand: { type: Number, default: 0 },      // physical stock
            reserved: { type: Number, default: 0 },    // held for pending orders
            available: { type: Number, default: 0 },   // onHand - reserved (computed)
        },
        unitOfMeasure: { type: String, trim: true },

        // FIFO/weighted avg cost
        costPerUnit: { type: Number, default: 0 },
        totalValue: { type: Number, default: 0 },    // onHand × costPerUnit

        lastMovementDate: { type: Date },
        lastCountDate: { type: Date },
    },
    { timestamps: true }
);

// Unique stock record per (product, warehouse, batch)
// Using null batchNumber allows single record per product-warehouse for non-batch items
stockItemSchema.index(
    { productId: 1, warehouseId: 1, batchNumber: 1, variationId: 1 },
    { unique: true }
);
stockItemSchema.index({ warehouseId: 1, productId: 1 });
stockItemSchema.index({ 'quantities.available': 1 });
stockItemSchema.index({ expiryDate: 1 });

// Keep available in sync before save
stockItemSchema.pre('save', function () {
    this.quantities.available = Math.max(0, this.quantities.onHand - this.quantities.reserved);
    this.totalValue = +(this.quantities.onHand * this.costPerUnit).toFixed(2);
});

const StockItem = mongoose.model('StockItem', stockItemSchema);
export default StockItem;