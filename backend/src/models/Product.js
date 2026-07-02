import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const productSchema = new mongoose.Schema(
    {
        productCode: {
            type: String,
            unique: true,
            trim: true,
            uppercase: true,
        },
        sku: {
            type: String,
            trim: true,
            sparse: true, // allows multiple nulls but enforces uniqueness when present
            uppercase: true,
        },
        barcode: {
            type: String,
            trim: true,
            sparse: true,
        },

        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: 200,
        },
        productType: {
            type: String,
            enum: ['finished_good', 'raw_material', 'semi_finished', 'packaging', 'service', 'consumable'],
            default: 'finished_good',
        },
        canBeManufactured: { type: Boolean, default: false },
        canBePurchased: { type: Boolean, default: true },
        canBeSold: { type: Boolean, default: true },
        shortName: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },
        brandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand',
        },
        tags: [{ type: String, trim: true }],

        type: {
            type: String,
            enum: ['manufactured', 'trading', 'service', 'bundle'],
            default: 'trading',
        },

        productNature: {
            type: String,
            enum: ['single', 'variable', 'combo'],
            default: 'single',
        },

        variations: [
            {
                sku: String,
                name: String,
                barcode: String,
                attributeName: String, // e.g., Color
                attributeValue: String, // e.g., Red
                price: { type: Number, min: 0 },
                purchasePrice: { type: Number, min: 0, default: 0 },
                stock: { type: Number, default: 0 },
            },
        ],

        comboItems: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                quantity: { type: Number, default: 1 },
                priceContribution: { type: Number, default: 0 },
            },
        ],

        unitOfMeasure: {
            type: String,
            required: [true, 'Unit of measure is required'],
            trim: true,
        },

        // Pricing — LKR only for MVP
        basePrice: {
            type: Number,
            required: [true, 'Base price is required'],
            min: 0,
        },
        purchasePrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        mrp: {
            type: Number,
            min: 0,
        },
        callPrice: {
            type: Number,
            min: 0,
        },
        currency: {
            type: String,
            default: 'LKR',
        },

        // Tiered wholesale pricing (optional)
        tierPricing: [
            {
                tierName: { type: String, trim: true },
                minQuantity: { type: Number, min: 0 },
                maxQuantity: { type: Number },
                price: { type: Number, min: 0 },
            },
        ],

        // Tax
        tax: {
            taxable: { type: Boolean, default: false },
            taxRate: { type: Number, default: 0, min: 0, max: 100 }, // SL VAT default 0%
            hsCode: { type: String, trim: true },
        },

        // Cost tracking
        costs: {
            lastPurchaseCost: { type: Number, default: 0, min: 0 },
            averageCost: { type: Number, default: 0, min: 0 },
            standardCost: { type: Number, default: 0, min: 0 },
        },

        // Stock rules
        stockLevels: {
            minimumLevel: { type: Number, default: 0, min: 0 },
            reorderLevel: { type: Number, default: 0, min: 0 },
            maximumLevel: { type: Number, default: 0, min: 0 },
        },

        // Packaging
        packaging: {
            unitsPerCarton: { type: Number, min: 0 },
            cartonsPerPallet: { type: Number, min: 0 },
        },

        // Sales configuration
        salesConfig: {
            sellable: { type: Boolean, default: true },
            minimumOrderQuantity: { type: Number, default: 1, min: 0 },
            allowBackorder: { type: Boolean, default: false },
        },

        status: {
            type: String,
            enum: ['active', 'inactive', 'draft', 'discontinued'],
            default: 'active',
        },

        notes: { type: String, trim: true, maxlength: 1000 },
        image: { type: String },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Indexes for performance
productSchema.index({ name: 'text', shortName: 'text', sku: 'text', productCode: 'text' });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ brandId: 1, status: 1 });
productSchema.index({ status: 1 });

// Auto-generate productCode & barcode before saving
productSchema.pre('save', async function () {
    if (this.isNew && !this.productCode) {
        const seq = await getNextSequence('product');
        this.productCode = `PRD-${seq}`;
    }

    if (this.isNew && !this.barcode) {
        let seqNum = 1;
        if (this.productCode) {
            const match = this.productCode.match(/\d+/);
            if (match) seqNum = parseInt(match[0], 10);
        } else {
            // If productCode hasn't run yet, let's grab sequence now
            const seq = await getNextSequence('product');
            this.productCode = `PRD-${seq}`;
            seqNum = seq;
        }

        // Generate EAN-13 (prefix 200 for internal use + 9-digit sequence + 1 checksum digit)
        const rawBarcode = `200${String(seqNum).padStart(9, '0')}`;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(rawBarcode[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        this.barcode = `${rawBarcode}${checkDigit}`;
    }
});

// Auto-filter soft-deleted
productSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;