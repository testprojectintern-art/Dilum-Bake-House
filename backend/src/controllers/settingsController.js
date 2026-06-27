import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import CompanySettings from '../models/CompanySettings.js';

/**
 * GET /api/settings/company
 * Get the company settings (creates a default one if it doesn't exist)
 */
export const getCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = await CompanySettings.create({});
    }

    res.status(200).json({ success: true, data: settings });
});

/**
 * PUT /api/settings/company
 * Update the company settings
 */
export const updateCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = new CompanySettings();
    }

    const {
        companyName, address, phone, email, website, taxRegistrationNumber, receiptFooterMessage, logo
    } = req.body;

    if (companyName !== undefined) settings.companyName = companyName;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (website !== undefined) settings.website = website;
    if (taxRegistrationNumber !== undefined) settings.taxRegistrationNumber = taxRegistrationNumber;
    if (receiptFooterMessage !== undefined) settings.receiptFooterMessage = receiptFooterMessage;
    if (logo !== undefined) settings.logo = logo;

    const updatedSettings = await settings.save();
    res.status(200).json({ success: true, data: updatedSettings });
});

/**
 * GET /api/settings/db-stats
 * Get database statistics and collection-level storage breakdown
 */
export const getDbStats = asyncHandler(async (req, res) => {
    const db = mongoose.connection.db;

    // Fetch general database statistics
    const stats = await db.command({ dbStats: 1 });

    // Fetch list of collections
    const collections = await db.listCollections().toArray();
    const collectionStats = [];

    for (const col of collections) {
        const name = col.name;
        // Skip system collections
        if (name.startsWith('system.')) continue;

        try {
            // Run collStats on each collection
            const colStats = await db.command({ collStats: name });
            collectionStats.push({
                name,
                count: colStats.count,
                size: colStats.size || 0, // raw data size in bytes
                storageSize: colStats.storageSize || 0, // compressed storage size in bytes
                totalIndexSize: colStats.totalIndexSize || 0, // index size in bytes
                nindexes: colStats.nindexes || 0,
            });
        } catch (err) {
            // Fallback count in case collStats fails
            const count = await db.collection(name).countDocuments().catch(() => 0);
            collectionStats.push({
                name,
                count,
                size: 0,
                storageSize: 0,
                totalIndexSize: 0,
                nindexes: 0,
                error: err.message
            });
        }
    }

    // Sort collections by storage size descending
    collectionStats.sort((a, b) => b.storageSize - a.storageSize);

    res.status(200).json({
        success: true,
        data: {
            dbName: stats.db,
            collectionsCount: stats.collections,
            objectsCount: stats.objects,
            avgObjSize: stats.avgObjSize || 0,
            dataSize: stats.dataSize || 0,
            storageSize: stats.storageSize || 0,
            indexesCount: stats.indexes,
            indexSize: stats.indexSize || 0,
            totalSize: stats.totalSize || ((stats.storageSize || 0) + (stats.indexSize || 0)),
            collections: collectionStats
        }
    });
});
