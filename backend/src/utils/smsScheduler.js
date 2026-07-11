import Customer from '../models/Customer.js';
import BakeryFinanceItem from '../models/BakeryFinanceItem.js';
import { sendGeneralSms } from './smsHelper.js';

/**
 * Checks for customer birthdays and anniversaries and sends automated SMS greetings.
 */
export const checkAndSendAnniversarySms = async () => {
    try {
        console.log('[SMS SCHEDULER] Running daily check for birthdays and anniversaries...');
        const now = new Date();
        const todayMonth = now.getMonth() + 1; // 1-indexed month
        const todayDay = now.getDate(); // Day of month

        // 1. Find customers with birthdays today
        const birthdayCustomers = await Customer.find({
            status: 'active',
            birthday: { $ne: null },
            deletedAt: null,
            $expr: {
                $and: [
                    { $eq: [{ $month: '$birthday' }, todayMonth] },
                    { $eq: [{ $dayOfMonth: '$birthday' }, todayDay] }
                ]
            }
        });

        console.log(`[SMS SCHEDULER] Found ${birthdayCustomers.length} birthday customers today.`);
        for (const customer of birthdayCustomers) {
            const phone = customer.primaryContact?.phone || customer.primaryContact?.mobile || customer.billingAddress?.phone;
            if (phone) {
                const message = `Dear ${customer.displayName}, Happy Birthday from Dilum Bake House! Celebrate your day with a special discount. Use coupon HBD10 on your next purchase.`;
                await sendGeneralSms(phone, message);
            } else {
                console.log(`[SMS SCHEDULER] Skipping birthday SMS for ${customer.displayName}: No phone number.`);
            }
        }

        // 2. Find customers with anniversaries today
        const anniversaryCustomers = await Customer.find({
            status: 'active',
            anniversaryDate: { $ne: null },
            deletedAt: null,
            $expr: {
                $and: [
                    { $eq: [{ $month: '$anniversaryDate' }, todayMonth] },
                    { $eq: [{ $dayOfMonth: '$anniversaryDate' }, todayDay] }
                ]
            }
        });

        console.log(`[SMS SCHEDULER] Found ${anniversaryCustomers.length} anniversary customers today.`);
        for (const customer of anniversaryCustomers) {
            const phone = customer.primaryContact?.phone || customer.primaryContact?.mobile || customer.billingAddress?.phone;
            if (phone) {
                const message = `Dear ${customer.displayName}, Happy Anniversary from Dilum Bake House! Enjoy a special discount on bakery items as a thank you for your loyalty. Use coupon ANNIV10.`;
                await sendGeneralSms(phone, message);
            } else {
                console.log(`[SMS SCHEDULER] Skipping anniversary SMS for ${customer.displayName}: No phone number.`);
            }
        }

        console.log('[SMS SCHEDULER] Daily scheduler run completed successfully.');
    } catch (error) {
        console.error('[SMS SCHEDULER ERROR] Failed in checking birthdays/anniversaries:', error);
    }
};

/**
 * Checks for upcoming bakery finance obligations (leases, fuel, cheques, utility bills, license/insurance)
 * due within the next 2 days (or past due) and sends SMS notifications.
 */
export const checkAndSendBakeryFinanceAlerts = async () => {
    try {
        console.log('[SMS SCHEDULER] Running daily check for upcoming finance/lease alerts...');
        
        // Target date is 2 days from now (catch all up to end of day 2 days from now)
        const targetDateEnd = new Date();
        targetDateEnd.setDate(targetDateEnd.getDate() + 2);
        targetDateEnd.setHours(23, 59, 59, 999);

        // Find pending items due in 2 days (or past due and not alerted yet)
        const dueItems = await BakeryFinanceItem.find({
            status: 'pending',
            alertSent: false,
            dueDate: { $lte: targetDateEnd }
        });

        console.log(`[SMS SCHEDULER] Found ${dueItems.length} finance/lease items due for alert.`);

        for (const item of dueItems) {
            const formattedDate = new Date(item.dueDate).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            });

            let message = '';
            const typeLabels = {
                piti_cheque: 'Flour (Piti) Cheque',
                vehicle_fuel: 'Vehicle Fuel Expense',
                vehicle_finance: 'Vehicle Lease/Finance',
                vehicle_insurance: 'Vehicle Insurance Expiry',
                vehicle_license: 'Vehicle License Expiry',
                utility_bill: 'Utility Bill',
                other: 'Payment Obligation'
            };

            const typeLabel = typeLabels[item.type] || 'Payment Obligation';
            const remaining = item.amount - item.paidAmount;

            if (item.type === 'piti_cheque') {
                message = `Alert: Flour (Piti) Cheque No. ${item.chequeNumber || 'N/A'} of Rs. ${item.amount.toFixed(2)} is due for clearing on ${formattedDate}. Notes: ${item.notes || 'none'}`;
            } else if (item.type === 'vehicle_insurance' || item.type === 'vehicle_license') {
                message = `Alert: ${typeLabel} for "${item.title}" will expire on ${formattedDate}. Please renew immediately.`;
            } else {
                message = `Alert: ${typeLabel} for "${item.title}" is due on ${formattedDate}. Total: Rs. ${item.amount.toFixed(2)}, Bal Due: Rs. ${remaining.toFixed(2)}.`;
            }

            const alertPhones = item.alertPhoneNumbers && item.alertPhoneNumbers.length > 0
                ? item.alertPhoneNumbers
                : ['0772268608', '0762125472'];

            for (const phone of alertPhones) {
                console.log(`[SMS SCHEDULER] Sending finance alert to ${phone}: "${message}"`);
                await sendGeneralSms(phone, message);
            }

            item.alertSent = true;
            await item.save();
        }

        console.log('[SMS SCHEDULER] Finance alerts check completed.');
    } catch (error) {
        console.error('[SMS SCHEDULER ERROR] Failed checking finance alerts:', error);
    }
};

/**
 * Initializes the automated daily anniversary and finance alerts SMS task.
 * Schedules the task to run once every 24 hours.
 */
export const initSmsScheduler = () => {
    // Run once on startup (with a small delay to avoid slowing server boot)
    setTimeout(async () => {
        await checkAndSendAnniversarySms();
        await checkAndSendBakeryFinanceAlerts();
    }, 10000); // 10 seconds after server starts

    // Calculate time until next check (e.g. next day 9:00 AM)
    const getMsUntilNextNineAM = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(9, 0, 0, 0); // 9:00 AM today

        if (now >= target) {
            // Target is past, set for tomorrow
            target.setDate(target.getDate() + 1);
        }
        return target.getTime() - now.getTime();
    };

    const scheduleNextRun = () => {
        const delay = getMsUntilNextNineAM();
        console.log(`[SMS SCHEDULER] Next automatic run scheduled in ${Math.round(delay / (1000 * 60))} minutes (at 9:00 AM).`);
        
        setTimeout(async () => {
            await checkAndSendAnniversarySms();
            await checkAndSendBakeryFinanceAlerts();
            // Reschedule after execution
            scheduleNextRun();
        }, delay);
    };

    scheduleNextRun();
};
