import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NuwaraEliyaDelivery from './src/models/NuwaraEliyaDelivery.js';
import BakeryProduct from './src/models/BakeryProduct.js';

dotenv.config();

const runTest = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected successfully!');

        // 1. Create a dummy product for testing if none exist
        let product = await BakeryProduct.findOne();
        if (!product) {
            console.log('No bakery products found. Creating a test product...');
            product = await BakeryProduct.create({
                name: 'Test Nuwara Eliya Bread'
            });
            console.log('Test product created:', product.name);
        }

        // 2. Clear previous test runs
        await NuwaraEliyaDelivery.deleteMany({ billNumber: { $regex: /^TEST-NED-/ } });

        console.log('\n--- Test 1: Creating a Consignment Trip Settlement ---');
        const testBill1 = await NuwaraEliyaDelivery.create({
            billNumber: 'TEST-NED-001',
            date: new Date(),
            loadedItems: [
                { productName: product.name, price: 100, qty: 50 }
            ],
            loadCost: 5000,
            previousOutstanding: 2000,
            bankDeposits: 3000,
            returnedItems: [
                { productName: product.name, price: 100, qty: 5 }
            ],
            returnsCost: 500,
            onBoardItems: [
                { productName: product.name, price: 100, qty: 5 }
            ],
            onBoardStockCost: 500,
            shopsOutstanding: 1000,
            amountPaid: 1500,
            // calculations:
            // subtotal = 5000 (loadCost) + 2000 (prevOutstanding) = 7000 LKR
            // totalDeductions = 3000 (deposits) + 500 (returns) + 500 (onboard) + 1000 (shops) = 5000 LKR
            // netOutstanding = 7000 - 5000 = 2000 LKR
            // nextOutstanding = 2000 - 1500 = 500 LKR
            netOutstanding: 2000,
            nextOutstanding: 500
        });

        console.log('Trip 1 saved successfully!');
        console.log('Bill Number:', testBill1.billNumber);
        console.log('Net Outstanding calculated:', testBill1.netOutstanding, '(Expected: 2000)');
        console.log('Next Carryover calculated:', testBill1.nextOutstanding, '(Expected: 500)');

        console.log('\n--- Test 2: Fetching the Latest Carryover Balance ---');
        const latest = await NuwaraEliyaDelivery.findOne().sort({ date: -1, createdAt: -1 });
        console.log('Latest carryover outstanding fetched:', latest.nextOutstanding);
        if (latest.nextOutstanding === 500) {
            console.log('SUCCESS: Outstanding carryover matched expected value!');
        } else {
            console.log('FAILURE: Outstanding carryover mismatched!');
        }

        // Clean up test records
        await NuwaraEliyaDelivery.deleteMany({ billNumber: { $regex: /^TEST-NED-/ } });
        console.log('\nCleaned up test records successfully.');
        
        await mongoose.connection.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Test run failed with error:', error);
        process.exit(1);
    }
};

runTest();
