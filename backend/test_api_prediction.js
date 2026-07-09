import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import BakeryInvoice from './src/models/BakeryInvoice.js';
import NuwaraEliyaDelivery from './src/models/NuwaraEliyaDelivery.js';
import BakeryShop from './src/models/BakeryShop.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // 1. Check all bakery shops
        const bakeryShops = await BakeryShop.find().lean();
        console.log('Bakery Shops in DB:', bakeryShops);

        // 2. Check nuwara eliya deliveries
        const nuwaraDeliveries = await NuwaraEliyaDelivery.find().lean();
        console.log('Nuwara Eliya Deliveries in DB:', nuwaraDeliveries);

        // 3. Test shops list logic
        const shopNames = new Set(bakeryShops.map(s => s.name));
        nuwaraDeliveries.forEach(del => {
            if (del.structureName) {
                shopNames.add(`Nuwara Eliya (${del.structureName})`);
            }
        });
        const allShopsList = Array.from(shopNames).sort();
        console.log('Calculated allShopsList:', allShopsList);

        // 4. Test predictions for first shop
        let shopName = allShopsList[0];
        let dayOfWeek = 1; // Monday
        console.log(`Testing predictions for: ${shopName}, Day: ${dayOfWeek}`);

        const predictions = [];
        let countOfDays = 0;

        if (shopName) {
            const isNuwara = shopName.startsWith('Nuwara Eliya (');
            const productData = {};

            if (isNuwara) {
                const structureName = shopName.replace('Nuwara Eliya (', '').replace(')', '');
                const trips = await NuwaraEliyaDelivery.find({ structureName }).lean();
                console.log(`Found Nuwara Eliya trips for ${structureName}:`, trips.length);

                trips.forEach(trip => {
                    const tripDate = new Date(trip.date);
                    if (tripDate.getDay() === dayOfWeek) {
                        const dateStr = tripDate.toISOString().slice(0, 10);
                        trip.loadedItems.forEach(item => {
                            if (!productData[item.productName]) {
                                productData[item.productName] = { deliveredSum: 0, returnedSum: 0 };
                            }
                            productData[item.productName].deliveredSum += (item.qty || 0);
                        });
                        trip.returnedItems.forEach(item => {
                            if (!productData[item.productName]) {
                                productData[item.productName] = { deliveredSum: 0, returnedSum: 0 };
                            }
                            productData[item.productName].returnedSum += (item.qty || 0);
                        });
                        trip.onBoardItems.forEach(item => {
                            if (!productData[item.productName]) {
                                productData[item.productName] = { deliveredSum: 0, returnedSum: 0 };
                            }
                            productData[item.productName].returnedSum += (item.qty || 0);
                        });
                    }
                });
                const uniqueDays = new Set(trips.filter(t => new Date(t.date).getDay() === dayOfWeek).map(t => new Date(t.date).toISOString().slice(0, 10)));
                countOfDays = uniqueDays.size;
            } else {
                const invoices = await BakeryInvoice.find({ shopName }).lean();
                console.log(`Found invoices for ${shopName}:`, invoices.length);

                invoices.forEach(inv => {
                    const invDate = new Date(inv.date);
                    console.log(`Invoice Date: ${inv.date}, getDay(): ${invDate.getDay()}`);
                    if (invDate.getDay() === dayOfWeek) {
                        inv.items.forEach(item => {
                            if (!productData[item.productName]) {
                                productData[item.productName] = { deliveredSum: 0, returnedSum: 0 };
                            }
                            productData[item.productName].deliveredSum += ((item.morningQty || 0) + (item.afternoonQty || 0));
                            productData[item.productName].returnedSum += (item.returnQty || 0);
                        });
                    }
                });
                const uniqueDays = new Set(invoices.filter(inv => new Date(inv.date).getDay() === dayOfWeek).map(inv => new Date(inv.date).toISOString().slice(0, 10)));
                countOfDays = uniqueDays.size;
            }

            Object.entries(productData).forEach(([prodName, stats]) => {
                const denominator = countOfDays || 1;
                const avgDelivered = stats.deliveredSum / denominator;
                const avgReturned = stats.returnedSum / denominator;
                const avgSold = Math.max(0, avgDelivered - avgReturned);
                const recommendedQty = Math.ceil(avgSold * 1.1);

                predictions.push({
                    productName: prodName,
                    avgDelivered,
                    avgReturned,
                    avgSold,
                    recommendedQty,
                    historicalDaysCount: countOfDays
                });
            });
        }

        console.log('Result predictions:', predictions);
        console.log('Result countOfDays:', countOfDays);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}
run();
