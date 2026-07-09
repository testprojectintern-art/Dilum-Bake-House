import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import BakeryInvoice from './src/models/BakeryInvoice.js';
import NuwaraEliyaDelivery from './src/models/NuwaraEliyaDelivery.js';
import BakeryShop from './src/models/BakeryShop.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Check all invoices
        const invoices = await BakeryInvoice.find().lean();
        console.log('Total BakeryInvoices:', invoices.length);
        invoices.forEach(inv => {
            console.log(`- Invoice: ${inv.invoiceNumber}, Shop: ${inv.shopName}, Date: ${inv.date}, deliveredTotal: ${inv.deliveredTotal}, returnsTotal: ${inv.returnsTotal}, amountReceived: ${inv.amountReceived}, newBalance: ${inv.newBalance}`);
        });

        // Check date range for current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        console.log('\nCurrent month range:', monthStart, 'to', monthEnd);

        const thisMonthInvoices = await BakeryInvoice.find({ date: { $gte: monthStart, $lte: monthEnd } }).lean();
        console.log('This month invoices:', thisMonthInvoices.length);
        
        // Check Nuwara Eliya deliveries
        const deliveries = await NuwaraEliyaDelivery.find().lean();
        console.log('\nNuwara Eliya deliveries:', deliveries.length);
        deliveries.forEach(d => {
            console.log(`- Bill: ${d.billNumber}, structureName: '${d.structureName}', date: ${d.date}, loadCost: ${d.loadCost}, status: ${d.status}`);
        });

        // Check bakery shops
        const shops = await BakeryShop.find().lean();
        console.log('\nBakery Shops:', shops.map(s => `${s.name} (balance: ${s.balance})`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}
run();
