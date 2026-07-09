// Quick test of the updated logic
import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

import BakeryInvoice from './src/models/BakeryInvoice.js';
import BakeryShop from './src/models/BakeryShop.js';

await mongoose.connect(process.env.MONGO_URI);

const shopName = 'Kandy Hospital';
const dayOfWeek = undefined; // All days mode
const filterByDay = (dayOfWeek !== undefined && dayOfWeek !== '');
const dayOfWeekNum = filterByDay ? parseInt(dayOfWeek) : null;

const invoices = await BakeryInvoice.find({ shopName }).lean();
const matchingInvoices = filterByDay
    ? invoices.filter(inv => new Date(inv.date).getDay() === dayOfWeekNum)
    : invoices;

console.log(`All invoices for ${shopName}:`, invoices.length);
console.log(`Matching invoices (all days):`, matchingInvoices.length);

const productData = {};
matchingInvoices.forEach(inv => {
    inv.items.forEach(item => {
        if (!productData[item.productName]) {
            productData[item.productName] = { deliveredSum: 0, returnedSum: 0 };
        }
        productData[item.productName].deliveredSum += ((item.morningQty || 0) + (item.afternoonQty || 0));
        productData[item.productName].returnedSum += (item.returnQty || 0);
    });
});

const uniqueDays = new Set(matchingInvoices.map(inv => new Date(inv.date).toISOString().slice(0, 10)));
const countOfDays = uniqueDays.size;

console.log('Unique invoice days:', Array.from(uniqueDays));
console.log('countOfDays:', countOfDays);

const predictions = Object.entries(productData).map(([prodName, stats]) => {
    const denominator = countOfDays || 1;
    const avgDelivered = stats.deliveredSum / denominator;
    const avgReturned = stats.returnedSum / denominator;
    const avgSold = Math.max(0, avgDelivered - avgReturned);
    const recommendedQty = Math.ceil(avgSold * 1.1);
    return { productName: prodName, avgDelivered, avgReturned, avgSold, recommendedQty };
}).sort((a, b) => b.avgSold - a.avgSold);

console.log('\nPredictions (first 5):');
predictions.slice(0, 5).forEach(p => console.log(` - ${p.productName}: avg sold=${p.avgSold.toFixed(1)}, recommended=${p.recommendedQty}`));

await mongoose.connection.close();
