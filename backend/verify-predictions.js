import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import SalesOrder from './src/models/SalesOrder.js';
import Category from './src/models/Category.js';
import Expense from './src/models/Expense.js';
import Installment from './src/models/Installment.js';
import BankAccount from './src/models/BankAccount.js';
import StockItem from './src/models/StockItem.js';
import { getPredictiveAnalytics } from './src/controllers/reports/aiPredictiveController.js';

dotenv.config();

const runVerification = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected');

        // 1. Get default category or create mock one
        let category = await Category.findOne({ name: 'General' });
        if (!category) {
            category = await Category.create({ name: 'General', code: 'GEN' });
        }

        // 2. Create mock Product
        console.log('Creating mock product...');
        const product = await Product.create({
            name: 'AI Test Gadget',
            productCode: 'AITEST',
            categoryId: category._id,
            productType: 'finished_good',
            canBeSold: true,
            basePrice: 100,
            unitOfMeasure: 'pcs'
        });

        // 3. Create mock Stock level
        console.log('Setting stock level...');
        // Let's find warehouse or create mock one
        const mockWarehouseId = new mongoose.Types.ObjectId();
        await StockItem.create({
            productId: product._id,
            warehouseId: mockWarehouseId,
            quantities: {
                onHand: 150, // 150 units in stock
                reserved: 10,
                available: 140
            },
            costPerUnit: 100
        });

        // 4. Create mock Sales Orders (spread over past 15 days to simulate sales velocity)
        console.log('Creating mock Sales Orders...');
        const salesToInsert = [];
        let totalSoldQty = 0;

        for (let i = 1; i <= 15; i++) {
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - i);
            
            // Linear trend: Day 1 sold 10 units, Day 2 sold 11, etc.
            const qty = 10 + i; 
            totalSoldQty += qty;

            salesToInsert.push({
                orderNumber: `SO-TEST-${i}`,
                orderDate,
                customerId: new mongoose.Types.ObjectId(),
                customerSnapshot: { name: 'AI Test Customer', code: 'CUST-AI' },
                items: [{
                    productId: product._id,
                    productName: product.name,
                    productCode: product.productCode,
                    orderedQuantity: qty,
                    unitPrice: 1000,
                    listPrice: 1000
                }],
                subTotal: qty * 1000,
                grandTotal: qty * 1000,
                status: 'completed'
            });
        }
        await SalesOrder.insertMany(salesToInsert);

        // 5. Create mock overdue Installment plan
        console.log('Creating mock overdue installment...');
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 5); // 5 days overdue
        await Installment.create({
            installmentNumber: 'INST-AI-OVERDUE',
            customerId: new mongoose.Types.ObjectId(),
            invoiceId: new mongoose.Types.ObjectId(),
            customerName: 'AI Debtor',
            totalAmount: 10000,
            downPayment: 2000,
            remainingAmount: 8000,
            numberOfInstallments: 1,
            schedule: [{
                installmentNo: 1,
                dueDate: overdueDate,
                amount: 8000,
                status: 'pending' // pending past due date = overdue
            }],
            status: 'active'
        });

        // 6. Invoke predictive analytics logic by calling the controller directly with a mock req/res
        console.log('Running AI Predictive Analytics controller verification...');
        let jsonResponse = null;
        const mockReq = {};
        const mockRes = {
            json: (payload) => {
                jsonResponse = payload;
            }
        };

        // Call the controller directly
        await getPredictiveAnalytics(mockReq, mockRes);

        console.log('\n--- VERIFICATION OUTPUT ---');
        console.log('Success:', jsonResponse?.success);
        console.log('Business Health Score:', jsonResponse?.data?.businessHealthScore);
        console.log('Projected 30d Revenue:', jsonResponse?.data?.metrics?.projectedRevenue30d);
        console.log('Total Active Predictions:', jsonResponse?.data?.predictions?.length);

        const testPred = jsonResponse?.data?.predictions?.find(p => p.productId === product._id.toString());
        console.log('\n- Product Predictions for AI Test Gadget:');
        console.log('  Calculated Daily Sales Velocity:', testPred?.dailyVelocity, 'units/day');
        console.log('  Expected Velocity Math (Total Sold / 90):', totalSoldQty / 90);
        console.log('  Forecasted 30d Demand:', testPred?.forecasted30dDemand, 'units');
        console.log('  Current Stock (onHand - reserved):', testPred?.currentStock, 'units');
        console.log('  Estimated Days Until Stockout:', testPred?.daysUntilStockout, 'days');
        console.log('  Safety Stock Level:', testPred?.safetyStock, 'units');
        console.log('  Reorder Alert Triggered:', testPred?.reorderAlert);

        console.log('\n- AI Insights Generated:');
        jsonResponse?.data?.insights?.forEach((ins, idx) => {
            console.log(`  [${ins.type.toUpperCase()}] ${ins.title}: ${ins.content}`);
        });
        console.log('---------------------------\n');

        // Assertions
        if (!jsonResponse?.success) throw new Error('API reported failure');
        if (!testPred) throw new Error('AI Test Gadget predictions not found in response');
        if (Math.abs(testPred.dailyVelocity - (totalSoldQty / 90)) > 0.001) throw new Error('Sales velocity calculation mismatch');
        if (testPred.daysUntilStockout !== Math.round(140 / (totalSoldQty / 90))) throw new Error('Days until stockout calculation mismatch');

        console.log('✓ All assertions passed successfully.');

    } finally {
        // 7. Cleanup the database to keep it fresh
        console.log('Cleaning up mock database records...');
        await Product.deleteMany({ name: 'AI Test Gadget' });
        await StockItem.deleteMany({ costPerUnit: 100 });
        await SalesOrder.deleteMany({ orderNumber: { $regex: 'SO-TEST-' } });
        await Installment.deleteMany({ installmentNumber: 'INST-AI-OVERDUE' });
        console.log('✓ Cleanup completed.');

        await mongoose.connection.close();
        console.log('✓ Connection closed.');
    }
};

runVerification();
